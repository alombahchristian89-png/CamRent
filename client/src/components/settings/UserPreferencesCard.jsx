import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import {
  getSavedLanguage,
  getSavedThemeMode,
  saveThemeMode
} from '../../utils/preferences'
import { translate } from '../../utils/i18n'
import LanguageIconMenu from './LanguageIconMenu'

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

  useEffect(() => {
    setThemeMode(getSavedThemeMode())
    setLanguage(getSavedLanguage())
  }, [])

  const handleThemeChange = (nextThemeMode) => {
    setThemeMode(nextThemeMode)
    saveThemeMode(nextThemeMode)
    toast.success(`${translate(language, 'toastThemeUpdated', 'Theme updated')}: ${translate(language, `theme${nextThemeMode.charAt(0).toUpperCase()}${nextThemeMode.slice(1)}`, nextThemeMode)}`)
  }

  const handleLanguageChange = async (nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) {
      return
    }

    setLanguage(nextLanguage)
    setIsUpdatingLanguage(true)

    const result = await updateLanguagePreference(nextLanguage)

    if (result.success) {
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
        <label className="mb-2 block text-sm font-semibold text-slate-900">
          {translate(language, 'prefLanguageTitle', 'Language')}
        </label>
        <div className="max-w-xs">
          <LanguageIconMenu
            language={language}
            onSelect={handleLanguageChange}
            disabled={isUpdatingLanguage}
            buttonClassName="h-11 w-11"
            menuClassName="left-0 right-auto"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{translate(language, 'prefLanguageHint', 'Available languages: English and French.')}</p>
      </div>
    </div>
  )
}

export default UserPreferencesCard
