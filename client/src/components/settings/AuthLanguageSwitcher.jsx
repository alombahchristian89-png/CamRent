import { useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { getSavedLanguage, saveLanguage } from '../../utils/preferences'
import LanguageIconMenu from './LanguageIconMenu'

const AuthLanguageSwitcher = () => {
  const [language, setLanguage] = useState('en')
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const { updateLanguagePreference } = useAuth()

  useEffect(() => {
    setLanguage(getSavedLanguage())
  }, [])

  const handleLanguageChange = async (nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) {
      return
    }

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
    <LanguageIconMenu
      language={language}
      onSelect={handleLanguageChange}
      disabled={isUpdatingLanguage}
    />
  )
}

export default AuthLanguageSwitcher
