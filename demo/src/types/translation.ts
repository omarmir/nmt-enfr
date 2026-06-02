export type TranslationDirection = 'en-fr' | 'fr-en'

export type LocaleCode = 'en' | 'fr'

export type GlossaryEntry = {
  id: string
  english: string
  french: string
  enabled: boolean
}

export type GlossarySet = {
  id: string
  name: string
  updated_at: number
  entries: GlossaryEntry[]
}
