import { useEffect, useState } from 'react'
import { Globe2, Monitor, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import {
  getSavedLanguage,
  getSavedThemeMode,
  saveLanguage,
  saveThemeMode
} from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const UserPreferencesCard = ({ compact = false }) => {
  const [themeMode, setThemeMode] = useState('system')
  const [language, setLanguage] = useState('en')
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const { updateLanguagePreference } = useAuth()

  const themeOptions = [
    { value: 'light', label: translate(language, 'themeLight', 'Light'), icon: Sun },
    { value: 'dark', label: translate(language, 'themeDark', 'Dark'), icon: Moon },
    { value: 'system', label: translate(language, 'themeSystem', 'System'), icon: Monitor }
  ]

  const languageOptions = [
    { value: 'en', label: translate(language, 'languageEnglish', 'English') },
    { value: 'fr', label: translate(language, 'languageFrench', 'French') }
  ]

  useEffect(() => {
    setThemeMode(getSavedThemeMode())
    setLanguage(getSavedLanguage())
  }, [])

  const handleThemeChange = (nextThemeMode) => {
    setThemeMode(nextThemeMode)
    saveThemeMode(nextThemeMode)
    toast.success(`${translate(language, 'toastThemeUpdated', 'Theme updated')}: ${translate(language, `theme${nextThemeMode.charAt(0).toUpperCase()}${nextThemeMode.slice(1)}`, nextThemeMode)}`)
  }

  const handleLanguageChange = async (event) => {
    const nextLanguage = event.target.value
    setLanguage(nextLanguage)
    setIsUpdatingLanguage(true)

    const result = await updateLanguagePreference(nextLanguage)

    if (result.success) {
      saveLanguage(result.language)
      toast.success(result.language === 'fr' ? translate(result.language, 'toastLanguageFrench', 'Language set to French') : translate(result.language, 'toastLanguageEnglish', 'Language set to English'))
    } else {
      setLanguage(result.language || getSavedLanguage())
      toast.error(result.error || 'Failed to update language preference')
    }

    setIsUpdatingLanguage(false)
  }

  return (
    <div className={`space-y-5 ${compact ? '' : 'rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm'}`}>
      <div>
        <p className="text-sm font-semibold text-slate-900">{translate(language, 'prefThemeTitle', 'Theme')}</p>
        <p className="text-sm text-slate-500">{translate(language, 'prefThemeDescription', 'Choose how CAMRENT looks for your account.')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = themeMode === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          )
        })}
      </div>

      <div>
        <label htmlFor="language-setting" className="mb-2 block text-sm font-semibold text-slate-900">
          {translate(language, 'prefLanguageTitle', 'Language')}
        </label>
        <div className="relative max-w-xs">
          <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            id="language-setting"
            value={language}
            onChange={handleLanguageChange}
            disabled={isUpdatingLanguage}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-500">{translate(language, 'prefLanguageHint', 'Available languages: English and French.')}</p>
      </div>
    </div>
  )
}

export default UserPreferencesCard
