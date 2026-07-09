import { useEffect, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getSavedLanguage, saveLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const AuthLanguageSwitcher = () => {
  const [language, setLanguage] = useState('en')
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const { updateLanguagePreference } = useAuth()

  useEffect(() => {
    setLanguage(getSavedLanguage())
  }, [])

  const handleLanguageChange = async (event) => {
    const nextLanguage = event.target.value
    setLanguage(nextLanguage)
    setIsUpdatingLanguage(true)

    const result = await updateLanguagePreference(nextLanguage)
    if (result.success) {
      saveLanguage(result.language)
    } else {
      setLanguage(result.language || getSavedLanguage())
      saveLanguage(result.language || getSavedLanguage())
    }

    setIsUpdatingLanguage(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <div className="relative min-w-[160px]">
        <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={language}
          onChange={handleLanguageChange}
          disabled={isUpdatingLanguage}
          className="w-full appearance-none bg-transparent py-0.5 pl-9 pr-5 text-sm font-medium text-slate-700 outline-none"
          aria-label={translate(language, 'prefLanguageTitle', 'Language')}
        >
          <option value="en">{translate(language, 'languageEnglish', 'English')}</option>
          <option value="fr">{translate(language, 'languageFrench', 'French')}</option>
        </select>
      </div>
    </div>
  )
}

export default AuthLanguageSwitcher
