export const THEME_MODES = ['light', 'dark', 'system']
export const LANGUAGE_OPTIONS = ['en', 'fr']

const THEME_KEY = 'camrent-theme-mode'
const LANGUAGE_KEY = 'camrent-language'

export const getSavedThemeMode = () => {
  if (typeof window === 'undefined') return 'system'
  const savedTheme = window.localStorage.getItem(THEME_KEY)
  return THEME_MODES.includes(savedTheme) ? savedTheme : 'system'
}

export const getSavedLanguage = () => {
  if (typeof window === 'undefined') return 'en'
  const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY)
  return LANGUAGE_OPTIONS.includes(savedLanguage) ? savedLanguage : 'en'
}

export const applyThemeMode = (themeMode) => {
  if (typeof window === 'undefined') return

  const root = window.document.documentElement
  const normalizedTheme = THEME_MODES.includes(themeMode) ? themeMode : 'system'
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const activeTheme = normalizedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : normalizedTheme

  root.setAttribute('data-theme', activeTheme)
  window.localStorage.setItem(THEME_KEY, normalizedTheme)
}

export const saveThemeMode = (themeMode) => {
  applyThemeMode(themeMode)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('camrent:preferences-updated'))
  }
}

export const saveLanguage = (language) => {
  if (typeof window === 'undefined') return
  const normalizedLanguage = LANGUAGE_OPTIONS.includes(language) ? language : 'en'
  window.localStorage.setItem(LANGUAGE_KEY, normalizedLanguage)
  window.dispatchEvent(new Event('camrent:preferences-updated'))
}
