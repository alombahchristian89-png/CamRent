import { useEffect, useState } from 'react'
import UserPreferencesCard from '../../components/settings/UserPreferencesCard'
import ProfileSettingsCard from '../../components/settings/ProfileSettingsCard'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const SettingsPage = () => {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncLanguagePreference = () => {
      setLanguage(getSavedLanguage())
    }

    syncLanguagePreference()
    window.addEventListener('camrent:preferences-updated', syncLanguagePreference)

    return () => {
      window.removeEventListener('camrent:preferences-updated', syncLanguagePreference)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{translate(language, 'settingsTitle', 'Settings')}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {translate(language, 'settingsDescription', 'Manage your appearance and language preferences.')}
        </p>
      </div>

      <ProfileSettingsCard />

      <UserPreferencesCard />
    </div>
  )
}

export default SettingsPage
