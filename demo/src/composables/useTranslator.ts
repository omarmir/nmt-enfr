import type { GlossarySet, TranslationDirection } from '@/types/translation'
import { computed, proxyRefs, ref, type Ref } from 'vue'
import JSZip from 'jszip'
import { useStorage } from '@vueuse/core'
import {
  createTranslator,
  modelForDirection as libraryModelForDirection,
  splitTextToSegments,
  type TranslationOptions,
  type TranslatorClient,
  type TranslatorEvent,
} from 'nmt-enfr'
import workerUrl from 'nmt-enfr/worker?url'
import {
  getSelectedGlossarySetId,
  listGlossarySets,
  setSelectedGlossarySetId,
} from '@/utils/glossary'

type DownloadStatus = {
  loaded: number
  total: number
}

type ModelProgress =
  | { status: 'initiate' | 'download' | 'done'; name?: string; file?: string }
  | { status: 'progress'; file?: string; loaded?: number; total?: number; name?: string }

const modelForDirection = (direction: TranslationDirection) =>
  libraryModelForDirection(direction) as string

const appAssetUrl = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, '/'), window.location.origin).href

const fileProgressDetails = ref(new Map<string, DownloadStatus & { model?: string }>())
const isLoaded = ref(false)
const activeModel = ref<string | null>(null)
const cores = window.navigator.hardwareConcurrency ?? 1
const deviceMemory =
  (window.navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? undefined
const translatedSentences: Ref<string[]> = ref([])
const isTranslating = ref(false)
const direction = useStorage<TranslationDirection>('nmt-direction', 'en-fr')
const glossarySets: Ref<GlossarySet[]> = ref([])
const selectedGlossarySetId = ref(getSelectedGlossarySetId())
const statusMessage = ref('')
const translatedDocument = ref<{ blob: Blob; name: string } | null>(null)
const state = useStorage('nmt-config', {
  max_length: 512,
  num_beams: 4,
  early_stopping: true,
  threads: Math.min(8, Math.max(1, Math.round(cores / 2))),
})

const currentTranslation: Ref<'doc' | 'txt' | null> = ref(null)
const executionTime = ref(0)
const completedCount = ref(0)
const totalSegments = ref(0)
const activeWorkerCount = ref(0)
const displayedModelProgress = ref(0)
let translationStartTime = 0
let translator: TranslatorClient | null = null
let loadPromise: Promise<void> | null = null

const requiredModel = computed(() => modelForDirection(direction.value))

const handleTranslatorEvent = (event: TranslatorEvent) => {
  if (event.type === 'model-progress') {
    const progress = event.progress as ModelProgress
    const file = progress.file || progress.name || event.model
    const key = `${event.model}/${file}`
    const existing = fileProgressDetails.value.get(key) || {
      loaded: 0,
      total: 0,
      model: event.model,
    }

    if (progress.status === 'progress') {
      fileProgressDetails.value.set(key, {
        loaded: Math.max(existing.loaded, progress.loaded || 0),
        total: Math.max(existing.total, progress.total || 0),
        model: event.model,
      })
      updateDisplayedModelProgress()
      return
    }

    if (progress.status === 'done') {
      fileProgressDetails.value.set(key, {
        loaded: existing.total || existing.loaded || 1,
        total: existing.total || existing.loaded || 1,
        model: event.model,
      })
      updateDisplayedModelProgress()
      return
    }

    fileProgressDetails.value.set(key, existing)
    updateDisplayedModelProgress()
    return
  }

  if (event.type === 'translation-progress') {
    completedCount.value = event.completed
    totalSegments.value = event.total
    activeWorkerCount.value = event.workers
  }
}

const getTranslator = async () => {
  if (translator) return translator
  translator = createTranslator({
    transformersUrl: appAssetUrl('transformers/transformers.min.js'),
    workerUrl,
    wasmBaseUrl: appAssetUrl('transformers/'),
    modelsBaseUrl: appAssetUrl('models/'),
    allowRemoteModels: false,
    allowLocalModels: true,
    dtype: 'q8',
    maxWorkers: state.value.threads,
    hardwareConcurrency: cores,
    deviceMemory,
    JSZip,
    onEvent: handleTranslatorEvent,
  })
  return translator
}

const refreshGlossarySets = async () => {
  glossarySets.value = await listGlossarySets()
  if (
    selectedGlossarySetId.value &&
    !glossarySets.value.some((set) => set.id === selectedGlossarySetId.value)
  ) {
    selectedGlossarySetId.value = ''
    setSelectedGlossarySetId('')
  }
}

const activeGlossaryEntries = async () => {
  await refreshGlossarySets()
  return glossarySets.value.find((item) => item.id === selectedGlossarySetId.value)?.entries || []
}

const setSelectedGlossary = (id: string) => {
  selectedGlossarySetId.value = id
  setSelectedGlossarySetId(id)
}

const startTimer = () => {
  translationStartTime = Date.now()
  executionTime.value = 0
}

const stopTimer = () => {
  if (translationStartTime <= 0) return
  executionTime.value = Date.now() - translationStartTime
  translationStartTime = 0
}

const resetTranslationState = () => {
  translatedSentences.value = []
  completedCount.value = 0
  totalSegments.value = 0
  activeWorkerCount.value = 0
  translatedDocument.value = null
  translationStartTime = 0
  executionTime.value = 0
  isTranslating.value = false
}

const resetModelProgress = () => {
  fileProgressDetails.value.clear()
  displayedModelProgress.value = 0
}

const updateDisplayedModelProgress = () => {
  const currentTotal = total.value
  if (currentTotal <= 0) return
  const currentProgress = Math.min(100, Math.max(0, (rawLoaded.value / currentTotal) * 100))
  displayedModelProgress.value = Math.max(displayedModelProgress.value, currentProgress)
}

const ensureModel = async () => {
  if (isLoaded.value && activeModel.value === requiredModel.value) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const client = await getTranslator()
      const result = await client.loadModel({
        direction: direction.value,
        model: requiredModel.value,
        dtype: 'q8',
      })
      activeModel.value = result.model
      isLoaded.value = result.model === requiredModel.value
      if (isLoaded.value) displayedModelProgress.value = 100
      statusMessage.value = ''
    } catch (error) {
      isLoaded.value = false
      activeModel.value = null
      statusMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

const translationOptions = async (): Promise<TranslationOptions> => ({
  direction: direction.value,
  model: requiredModel.value,
  dtype: 'q8',
  generation: {
    max_length: state.value.max_length,
    early_stopping: state.value.early_stopping,
    num_beams: state.value.num_beams,
  },
  glossary: await activeGlossaryEntries(),
  maxWorkers: state.value.threads,
  JSZip,
})

const runTranslation = async <T>(mode: 'txt' | 'doc', task: () => Promise<T>) => {
  currentTranslation.value = mode
  translatedDocument.value = null
  translatedSentences.value = []
  completedCount.value = 0
  totalSegments.value = 0
  activeWorkerCount.value = 0
  statusMessage.value = ''
  isTranslating.value = true
  startTimer()

  try {
    const result = await task()
    stopTimer()
    return result
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : String(error)
    stopTimer()
    throw error
  } finally {
    isTranslating.value = false
  }
}

const translate = async (input: string) => {
  if (input.trim() === '') return
  const client = await getTranslator()
  const segments = splitTextToSegments(input.trim())
  totalSegments.value = segments.length

  await runTranslation('txt', async () => {
    const result = await client.translateSegments(segments, await translationOptions())
    translatedSentences.value = result.segments
    completedCount.value = result.completed || result.segments.length
    totalSegments.value = result.total || segments.length
    return result
  })
}

const translateDocument = async (file: File) => {
  if (!/\.(docx|pptx)$/i.test(file.name)) {
    statusMessage.value = 'Only DOCX and PPTX files are supported.'
    return
  }

  const client = await getTranslator()
  await runTranslation('doc', async () => {
    const result = await client.translateDocument(file, await translationOptions())
    translatedSentences.value = result.segments
    completedCount.value = result.segments.length
    totalSegments.value = result.segments.length
    translatedDocument.value = { blob: result.blob, name: result.filename }
    return result
  })
}

const setDirection = async (nextDirection: TranslationDirection) => {
  if (direction.value === nextDirection) return
  translator?.cancel()
  resetTranslationState()
  direction.value = nextDirection
  activeModel.value = null
  isLoaded.value = false
  resetModelProgress()
  await ensureModel()
}

const total = computed(() =>
  Array.from(fileProgressDetails.value.values()).reduce((sum, { total }) => sum + total, 0),
)

const rawLoaded = computed(() =>
  Array.from(fileProgressDetails.value.values()).reduce((sum, { loaded }) => sum + loaded, 0),
)

const loaded = computed(() =>
  isLoaded.value ? total.value : (displayedModelProgress.value / 100) * total.value,
)

const outputPlaceholder = computed(() =>
  direction.value === 'fr-en' ? 'English text will appear here' : 'French text will appear here',
)

const outputText = computed(() => {
  if (currentTranslation.value !== 'txt') return outputPlaceholder.value
  return translatedSentences.value.join('') || outputPlaceholder.value
})

const downloadTranslatedDocument = () => {
  if (!translatedDocument.value) return
  const url = URL.createObjectURL(translatedDocument.value.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = translatedDocument.value.name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

let initialized = false

export function useTranslator() {
  if (!initialized) {
    initialized = true
    ensureModel()
    refreshGlossarySets()
  }

  return proxyRefs({
    translate,
    loaded,
    total,
    isLoaded,
    outputText,
    isTranslating,
    state,
    translateDocument,
    currentTranslation,
    executionTime,
    completedCount,
    totalSegments,
    activeWorkerCount,
    direction,
    setDirection,
    glossarySets,
    selectedGlossarySetId,
    setSelectedGlossary,
    refreshGlossarySets,
    statusMessage,
    translatedDocument,
    downloadTranslatedDocument,
  })
}
