import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { Bell, Calendar, CheckCircle, AlertTriangle, Ban } from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import {
  AdminEmptyState,
  AdminPageShell,
  AdminPagination,
  AdminSectionCard
} from '../../components/admin/AdminUI'
import { formatDateTimeLabel } from '../../components/admin/adminUtils'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const iconByType = {
  verification_approved: CheckCircle,
  verification_rejected: AlertTriangle,
  account_suspended: Ban,
  account_activated: CheckCircle,
  admin_info: Bell
}

const colorByType = {
  verification_approved: 'text-green-600 bg-green-50',
  verification_rejected: 'text-yellow-700 bg-yellow-50',
  account_suspended: 'text-red-600 bg-red-50',
  account_activated: 'text-green-600 bg-green-50',
  admin_info: 'text-blue-600 bg-blue-50'
}

const AdminNotifications = () => {
  const [language, setLanguage] = useState('en')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncLanguagePreference = () => {
      setLanguage(getSavedLanguage())
    }

    syncLanguagePreference()
    window.addEventListener('camrent:preferences-updated', syncLanguagePreference)
    window.addEventListener('storage', syncLanguagePreference)

    return () => {
      window.removeEventListener('camrent:preferences-updated', syncLanguagePreference)
      window.removeEventListener('storage', syncLanguagePreference)
    }
  }, [])

  const t = (key, fallback) => translate(language, key, fallback)

  const getNotificationTypeLabel = (type) => {
    if (type === 'verification_approved') return t('adminNotificationsTypeVerificationApproved', 'verification approved')
    if (type === 'verification_rejected') return t('adminNotificationsTypeVerificationRejected', 'verification rejected')
    if (type === 'account_suspended') return t('adminNotificationsTypeAccountSuspended', 'account suspended')
    if (type === 'account_activated') return t('adminNotificationsTypeAccountActivated', 'account activated')
    if (type === 'admin_info') return t('adminNotificationsTypeAdminInfo', 'admin info')
    return String(type || '').replaceAll('_', ' ')
  }

  const { data, isLoading } = useQuery(
    ['adminNotifications', { page }],
    () => adminAPI.getNotifications({ page }),
    {
      select: (response) => response.data.data
    }
  )

  const { notifications = [], pagination } = data || {}

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <AdminPageShell
      eyebrow={t('adminNotificationsEyebrow', 'Dashboard / Notifications')}
      title={t('adminNotificationsTitle', 'Notifications')}
      description={t('adminNotificationsDescription', 'Track verification outcomes, account actions, and platform alerts in one feed.')}
    >
      <AdminSectionCard title={t('adminNotificationsFeedTitle', 'Activity feed')} description={t('adminNotificationsFeedDescription', 'Newest notifications appear first so admins can act quickly.')}>
        {notifications.length === 0 ? (
          <AdminEmptyState
            icon={Bell}
            title={t('adminNotificationsEmptyTitle', 'No notifications yet')}
            description={t('adminNotificationsEmptyDescription', 'Notifications will appear here when verification reviews and moderation actions trigger updates.')}
          />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const Icon = iconByType[notification.type] || Bell
              const tone = colorByType[notification.type] || 'text-blue-600 bg-blue-50'

              return (
                <div key={notification.id} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
                        <span className="text-xs text-slate-500 capitalize">{getNotificationTypeLabel(notification.type)}</span>
                      </div>
                      <p className="mt-1 text-slate-600">{notification.message}</p>
                      <div className="mt-3 flex items-center text-sm text-slate-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDateTimeLabel(notification.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <AdminPagination
          page={pagination?.page || 1}
          pages={pagination?.pages || 0}
          onPageChange={setPage}
        />
      </AdminSectionCard>
    </AdminPageShell>
  )
}

export default AdminNotifications