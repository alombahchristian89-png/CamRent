import { useEffect, useState } from 'react'
import { AdminPageShell, AdminSectionCard } from '../../components/admin/AdminUI'
import UserPreferencesCard from '../../components/settings/UserPreferencesCard'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const AdminSettings = () => {
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

  const t = (key, fallback) => translate(language, key, fallback)

  return (
    <AdminPageShell
      eyebrow={`${t('navDashboard', 'Dashboard')} / ${t('navSettings', 'Settings')}`}
      title={`${t('navSettings', 'Settings')} ${t('adminLabel', 'Admin')}`}
      description={t('settingsDescription', 'Manage your appearance and language preferences.')}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title={t('adminSettingsNotificationPreferencesTitle', 'Notification Preferences')}
          description={t('adminSettingsNotificationPreferencesDescription', 'Choose which admin activities trigger immediate alerts.')}
        >
          <div className="space-y-4 text-sm text-slate-700">
            <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              {t('adminSettingsAlertVerificationDecisions', 'Send in-app alerts for verification decisions')}
            </label>
            <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked />
              {t('adminSettingsAlertSuspensionActions', 'Send in-app alerts for account suspension actions')}
            </label>
            <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
              <input type="checkbox" className="h-4 w-4" />
              {t('adminSettingsAlertEmail', 'Send email alerts (requires email service setup)')}
            </label>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminSettingsAuditComplianceTitle', 'Audit & Compliance')}
          description={t('adminSettingsAuditComplianceDescription', 'Keep the moderation workspace aligned with platform policies.')}
        >
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              {t('adminSettingsAuditComplianceNote1', 'Audit logs are generated for approve, reject, edit, delete, role change, and suspend actions.')}
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              {t('adminSettingsAuditComplianceNote2', 'Sensitive moderation activity should always be reviewed from the Audit Logs page before escalations.')}
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title={`${t('prefThemeTitle', 'Theme')} & ${t('prefLanguageTitle', 'Language')}`} description={t('settingsDescription', 'Manage your appearance and language preferences.')}>
          <UserPreferencesCard compact />
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  )
}

export default AdminSettings