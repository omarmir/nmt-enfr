import type { GlossaryEntry, GlossarySet } from '@/types/translation'

export const SELECTED_GLOSSARY_SET_KEY = 'nmt-selected-glossary-set-v1'
export const GLOSSARY_DB_NAME = 'nmt-glossaries'
export const GLOSSARY_DB_VERSION = 1
export const GLOSSARY_SET_STORE = 'glossarySets'

export function createGlossaryEntry(values: Partial<GlossaryEntry> = {}): GlossaryEntry {
  return {
    id: values.id || makeId(),
    english: String(values.english || '').trim(),
    french: String(values.french || '').trim(),
    enabled: values.enabled !== false,
  }
}

export function createGlossarySet(values: Partial<GlossarySet> = {}): GlossarySet {
  return {
    id: values.id || makeId(),
    name: String(values.name || '').trim() || 'Default glossary',
    updated_at: Number(values.updated_at) || Date.now(),
    entries: Array.isArray(values.entries) ? values.entries.map(createGlossaryEntry) : [],
  }
}

export async function listGlossarySets() {
  const db = await openGlossaryDb()
  if (!db) return []
  const sets = await getAll<GlossarySet>(db, GLOSSARY_SET_STORE)
  db.close()
  return sets.map(createGlossarySet).sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveGlossarySet(set: Partial<GlossarySet>) {
  const next = createGlossarySet({ ...set, updated_at: Date.now() })
  next.entries = next.entries.filter((entry) => entry.english || entry.french)
  const db = await openGlossaryDb()
  if (!db) return next
  await putOne(db, GLOSSARY_SET_STORE, next)
  db.close()
  return next
}

export async function deleteGlossarySet(id: string) {
  if (!id) return
  const db = await openGlossaryDb()
  if (!db) return
  await deleteOne(db, GLOSSARY_SET_STORE, id)
  db.close()
  if (getSelectedGlossarySetId() === id) setSelectedGlossarySetId('')
}

export async function clearGlossarySets() {
  const db = await openGlossaryDb()
  if (!db) return
  await clearStore(db, GLOSSARY_SET_STORE)
  db.close()
  setSelectedGlossarySetId('')
}

export function getSelectedGlossarySetId() {
  try {
    return localStorage.getItem(SELECTED_GLOSSARY_SET_KEY) || ''
  } catch {
    return ''
  }
}

export function setSelectedGlossarySetId(id: string) {
  try {
    if (id) localStorage.setItem(SELECTED_GLOSSARY_SET_KEY, id)
    else localStorage.removeItem(SELECTED_GLOSSARY_SET_KEY)
  } catch {
    // Ignore unavailable localStorage.
  }
}

export function parseGlossaryCsv(text: string) {
  const rows = parseDelimitedRows(String(text || ''))
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim()))
  if (!nonEmpty.length) return []

  const delimiterRows = nonEmpty.map((row) => row.map((cell) => cell.trim()))
  const header = delimiterRows[0].map((cell) => normalizeHeader(cell))
  let englishIndex = findHeaderIndex(header, ['english', 'en', 'source', 'source_en'])
  let frenchIndex = findHeaderIndex(header, ['french', 'fr', 'target', 'target_fr'])
  let start = 1

  if (englishIndex === -1 || frenchIndex === -1) {
    if (delimiterRows[0].length === 2) {
      englishIndex = 0
      frenchIndex = 1
      start = 0
    } else {
      return []
    }
  }

  const entries: GlossaryEntry[] = []
  for (const row of delimiterRows.slice(start)) {
    const english = (row[englishIndex] || '').trim()
    const french = (row[frenchIndex] || '').trim()
    if (!english && !french) continue
    entries.push(createGlossaryEntry({ english, french, enabled: true }))
  }
  return entries
}

export function exportGlossaryCsv(entries: GlossaryEntry[]) {
  const rows = [['english', 'french']]
  for (const entry of entries || []) {
    if (!entry.english && !entry.french) continue
    rows.push([entry.english || '', entry.french || ''])
  }
  return `${rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')}\n`
}

function openGlossaryDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GLOSSARY_DB_NAME, GLOSSARY_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(GLOSSARY_SET_STORE)) {
        db.createObjectStore(GLOSSARY_SET_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    request.onsuccess = () => resolve((request.result || []) as T[])
    request.onerror = () => reject(request.error)
  })
}

function putOne(db: IDBDatabase, storeName: string, value: GlossarySet) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function deleteOne(db: IDBDatabase, storeName: string, key: string) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function clearStore(db: IDBDatabase, storeName: string) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function parseDelimitedRows(text: string) {
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function detectDelimiter(text: string) {
  const firstLine = String(text || '').split(/\r?\n/, 1)[0] || ''
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1
  for (const candidate of candidates) {
    const count = countUnquoted(firstLine, candidate)
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

function countUnquoted(text: string, delimiter: string) {
  let count = 0
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"' && text[index + 1] === '"') index++
    else if (char === '"') quoted = !quoted
    else if (!quoted && char === delimiter) count++
  }
  return count
}

function normalizeHeader(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, '_')
}

function findHeaderIndex(header: string[], names: string[]) {
  return header.findIndex((cell) => names.includes(cell))
}

function formatCsvCell(value: string) {
  const text = String(value || '')
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function makeId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
