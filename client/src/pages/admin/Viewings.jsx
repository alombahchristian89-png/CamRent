import { useEffect, useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  Calendar,
  Clock,
  Filter,
  MapPin,
  User,
  Phone,
  MessageSquare,
  ChevronRight,
  Home,
  Search
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge
} from '../../components/admin/AdminUI'

const AdminViewings = () => {
  const [language, setLanguage] = useState('en')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'

  const { data: inquiriesData, isLoading } = useQuery(
    ['adminInquiries', { status: filterStatus, search: searchQuery }],
    () => adminAPI.getInquiries({ status: filterStatus, search: searchQuery, limit: 100 }),
    { select: (response) => response.data.data }
  )

  const { inquiries = [] } = inquiriesData || {}

  // Real viewing data based on actual inquiries
  const viewings = useMemo(() => {
    return inquiries
      .filter((inq) => filterStatus === 'all' || inq.status === filterStatus)
      .filter((inq) =>
        searchQuery === '' ||
        (inq.tenantName && inq.tenantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inq.propertyTitle && inq.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .map((inq) => ({
        id: inq.id,
        propertyTitle: inq.propertyTitle || 'Unknown Property',
        propertyLocation: inq.propertyLocation || 'Unknown',
        tenantName: inq.tenantName || 'Unknown',
        tenantPhone: inq.tenantPhone || 'N/A',
        tenantEmail: inq.tenantEmail || 'N/A',
        inquiredDate: inq.created_at || new Date(),
        status: inq.status === 'responded' ? 'inquiry-viewed' : inq.status === 'closed' ? 'inquiry-closed' : 'inquiry-pending',
        notes: inq.message || 'No inquiry details provided'
      }))
      .sort((a, b) => new Date(b.inquiredDate) - new Date(a.inquiredDate))
  }, [inquiries, filterStatus, searchQuery])

  const upcomingViewings = viewings.length > 0 ? viewings.slice(0, 5) : []
  const totalScheduled = viewings.filter((v) => !v.status.includes('closed')).length
  const inquiryResponses = viewings.filter((v) => v.status === 'inquiry-viewed').length

  const formatDate = (date) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    if (status === 'inquiry-viewed') return 'emerald'
    if (status === 'inquiry-pending') return 'blue'
    return 'slate'
  }

  const getStatusLabel = (status) => {
    if (status === 'inquiry-viewed') return t('adminViewingsStatusViewed', 'Responded')
    if (status === 'inquiry-pending') return t('adminViewingsStatusPending', 'Pending')
    return t('adminViewingsStatusClosed', 'Closed')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <AdminPageShell
      eyebrow={t('adminNavigation', 'Admin')}
      title={t('adminViewingsTitle', 'Property Inquiries')}
      description={t('adminViewingsDescription', 'Track and manage all property inquiries from tenants')}
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="admin-surface p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{t('adminViewingsInquiries', 'Total inquiries')}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{viewings.length}</p>
          <p className="mt-2 text-xs text-slate-500">{t('adminViewingsInquiriesHelper', 'Property inquiries received')}</p>
        </div>
        <div className="admin-surface p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{t('adminViewingsPending', 'Pending inquiries')}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{totalScheduled}</p>
          <p className="mt-2 text-xs text-slate-500">{t('adminViewingsPendingHelper', 'Awaiting response')}</p>
        </div>
        <div className="admin-surface p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{t('adminViewingsResponded', 'Responded')}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{inquiryResponses}</p>
          <p className="mt-2 text-xs text-slate-500">{t('adminViewingsRespondedHelper', 'Inquiries with responses')}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="admin-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder={t('adminViewingsSearchPlaceholder', 'Search by property or tenant name...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('adminCommonAll', 'All statuses')}</option>
            <option value="scheduled">{t('adminViewingsStatusScheduled', 'Scheduled')}</option>
            <option value="confirmed">{t('adminViewingsStatusConfirmed', 'Confirmed')}</option>
            <option value="completed">{t('adminViewingsStatusCompleted', 'Completed')}</option>
            <option value="cancelled">{t('adminViewingsStatusCancelled', 'Cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Inquiries List */}
      <AdminSectionCard
        title={t('adminViewingsList', 'All inquiries')}
        description={t('adminViewingsListHelper', 'Complete list of all property inquiries')}
      >
        {viewings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('adminViewingsEmpty', 'No inquiries found')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {viewings.map((viewing) => (
              <div
                key={viewing.id}
                className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{viewing.propertyTitle}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {viewing.propertyLocation}
                      </p>
                    </div>
                    <AdminStatusBadge tone={getStatusColor(viewing.status)}>
                      {getStatusLabel(viewing.status)}
                    </AdminStatusBadge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">{t('adminCommonTenant', 'Tenant')}</p>
                      <p className="font-medium text-slate-900">{viewing.tenantName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('adminCommonDate', 'Inquiry date')}</p>
                      <p className="font-medium text-slate-900 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(viewing.inquiredDate)}
                      </p>
                    </div>
                  </div>

                  {viewing.notes && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-sm text-slate-600">
                      <p className="text-xs text-slate-500 font-medium mb-1">{t('adminCommonInquiry', 'Inquiry')}</p>
                      <p className="line-clamp-2">{viewing.notes}</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${viewing.tenantPhone}`} className="text-blue-600 hover:underline">
                      {viewing.tenantPhone}
                    </a>
                    <span className="text-slate-300">•</span>
                    <MessageSquare className="h-4 w-4" />
                    <a href={`mailto:${viewing.tenantEmail}`} className="text-blue-600 hover:underline">
                      {viewing.tenantEmail}
                    </a>
                  </div>
                </div>

                <button className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  )
}

export default AdminViewings
