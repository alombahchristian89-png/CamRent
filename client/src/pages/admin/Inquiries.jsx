import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Flag,
  KeyRound,
  MessageSquare,
  Search,
  ShieldAlert,
  User,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const statusBadge = (status) => {
  if (status === 'responded') return 'bg-emerald-100 text-emerald-700'
  if (status === 'closed') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

const AdminInquiries = () => {
  const [language, setLanguage] = useState('en')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [decryptingInquiryId, setDecryptingInquiryId] = useState(null)

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

  const getStatusLabel = (status) => {
    if (status === 'responded') return t('adminInquiryStatusResponded', 'Responded')
    if (status === 'closed') return t('adminInquiryStatusClosed', 'Closed')
    return t('adminInquiryStatusPending', 'Pending')
  }

  const { data: inquiriesData, isLoading } = useQuery(
    ['adminInquiries', { page, status: filterStatus, search: searchQuery, dateRange }],
    () => adminAPI.getInquiries({ page, status: filterStatus, search: searchQuery, dateRange }),
    {
      select: (response) => response.data.data
    }
  )

  const { inquiries = [], pagination, stats } = inquiriesData || {}

  const decryptConversation = async (inquiryId) => {
    try {
      setDecryptingInquiryId(inquiryId)
      const response = await adminAPI.decryptInquiry(inquiryId)
      const decryptedInquiry = response?.data?.data?.inquiry || null
      setSelectedInquiry(decryptedInquiry)
      toast.success(t('adminInquiriesDecrypted', 'Conversation decrypted successfully.'))
    } catch (error) {
      toast.error(error?.response?.data?.message || t('adminInquiriesDecryptFailed', 'Failed to decrypt conversation.'))
    } finally {
      setDecryptingInquiryId(null)
    }
  }

  const formatDateTime = (dateValue) => {
    const value = new Date(dateValue)
    if (Number.isNaN(value.getTime())) return t('adminCommonUnknown', 'Unknown')
    return value.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const freezePlaceholder = () => {
    toast(t('adminInquiriesFreezePlaceholder', 'Conversation freeze control will be activated after backend policy hooks are ready.'))
  }

  const exportPlaceholder = () => {
    toast(t('adminInquiriesExportPlaceholder', 'Export endpoint is planned for the next moderation release.'))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="workspace-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('adminInquiriesOversight', 'Admin Oversight')}</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{t('adminInquiriesTitle', 'Conversation Monitoring')}</h1>
              <p className="mt-2 text-sm text-slate-600">{t('adminInquiriesDescription', 'Monitor all inquiry tickets, flag risk, and maintain auditable records across the platform.')}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700">
              <ShieldAlert className="h-4 w-4 text-slate-500" />
              {t('adminInquiriesModerationMode', 'Moderation mode active')}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminTotal', 'Total')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.total || 0}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminInquiryStatusPending', 'Pending')}</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{stats?.pending || 0}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminInquiryStatusResponded', 'Responded')}</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats?.responded || 0}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('adminInquiryStatusClosed', 'Closed')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-700">{stats?.closed || 0}</p>
            </div>
          </div>
        </section>

        <section className="workspace-panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('adminInquiriesSearchPlaceholder', 'Search by conversation, property, tenant, or landlord')}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setPage(1)
                }}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value)
                    setPage(1)
                  }}
                  className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">{t('adminInquiriesAllInquiries', 'All inquiries')}</option>
                  <option value="pending">{t('adminInquiryStatusPending', 'Pending')}</option>
                  <option value="responded">{t('adminInquiryStatusResponded', 'Responded')}</option>
                  <option value="closed">{t('adminInquiryStatusClosed', 'Closed')}</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(event) => {
                    setDateRange(event.target.value)
                    setPage(1)
                  }}
                  className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">{t('adminInquiriesAllTime', 'All time')}</option>
                  <option value="7d">{t('adminInquiriesLast7Days', 'Last 7 days')}</option>
                  <option value="30d">{t('adminInquiriesLast30Days', 'Last 30 days')}</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {inquiries.length === 0 ? (
          <section className="workspace-panel p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-14 w-14 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900">{t('adminInquiriesEmptyTitle', 'No inquiries found')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('adminInquiriesEmptyDescription', 'No tickets match the current search and filter combination.')}</p>
          </section>
        ) : (
          <section className="workspace-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{t('adminInquiriesConversationId', 'Conversation ID')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('adminUsersRoleTenant', 'Tenant')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('adminUsersRoleLandlord', 'Landlord')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('adminStatus', 'Status')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('adminInquiriesLastActivity', 'Last Activity')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('adminInquiriesModeration', 'Moderation')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {inquiries.map((inquiry) => {
                    const lastActivity = inquiry?.conversationMeta?.lastActivityAt || inquiry.updatedAt || inquiry.createdAt

                    return (
                      <tr key={inquiry._id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-mono text-xs text-slate-800">#{inquiry.conversationId || inquiry._id}</p>
                          <p className="mt-1 text-xs text-slate-500">{inquiry.propertyId?.title || t('adminInquiriesPropertyInquiry', 'Property inquiry')}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="inline-flex items-center gap-1 font-medium text-slate-900">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {inquiry.tenantId?.name || t('adminInquiriesUnknownTenant', 'Unknown tenant')}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{inquiry.tenantId?.email || inquiry.tenantContact?.email || t('adminInquiriesNoEmail', 'No email')}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-medium text-slate-900">{inquiry.landlordId?.name || t('adminInquiriesUnknownLandlord', 'Unknown landlord')}</p>
                          <p className="mt-1 text-xs text-slate-500">{inquiry.landlordId?.email || t('adminInquiriesNoEmail', 'No email')}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(inquiry.status)}`}>
                            {getStatusLabel(inquiry.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                          {formatDateTime(lastActivity)}
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => decryptConversation(inquiry._id)}
                              disabled={decryptingInquiryId === inquiry._id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              {decryptingInquiryId === inquiry._id
                                ? t('adminInquiriesDecrypting', 'Decrypting...')
                                : t('adminInquiriesDecrypt', 'Decrypt')}
                            </button>
                            <button
                              onClick={freezePlaceholder}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                            >
                              <Flag className="h-3.5 w-3.5" />
                              {t('adminInquiriesFreeze', 'Freeze')}
                            </button>
                            <button
                              onClick={exportPlaceholder}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {t('adminInquiriesExport', 'Export')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedInquiry && (
          <section className="workspace-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('adminInquiriesConversationSnapshot', 'Conversation Snapshot')}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{selectedInquiry.propertyId?.title || t('adminInquiriesDetails', 'Inquiry details')}</h2>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {t('adminInquiriesOpened', 'Opened')} {formatDateTime(selectedInquiry.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300"
              >
                <XCircle className="h-4 w-4" />
                {t('adminInquiriesClosePanel', 'Close Panel')}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('adminUsersRoleTenant', 'Tenant')}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{selectedInquiry.tenantId?.name || t('adminInquiriesUnknownTenant', 'Unknown tenant')}</p>
                <p className="mt-1 text-xs text-slate-600">{selectedInquiry.tenantId?.email || selectedInquiry.tenantContact?.email || t('adminInquiriesNoEmail', 'No email')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('adminUsersRoleLandlord', 'Landlord')}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{selectedInquiry.landlordId?.name || t('adminInquiriesUnknownLandlord', 'Unknown landlord')}</p>
                <p className="mt-1 text-xs text-slate-600">{selectedInquiry.landlordId?.email || t('adminInquiriesNoEmail', 'No email')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(selectedInquiry.messages || []).map((messageEntry, index) => {
                const senderName =
                  messageEntry.senderRole === 'landlord'
                    ? (selectedInquiry.landlordId?.name || t('adminUsersRoleLandlord', 'Landlord'))
                    : (selectedInquiry.tenantId?.name || t('adminUsersRoleTenant', 'Tenant'))

                return (
                  <article
                    key={`${messageEntry.createdAt || index}-${index}`}
                    className={`rounded-2xl border p-3.5 ${
                      messageEntry.senderRole === 'landlord'
                        ? 'border-blue-200 bg-blue-50/60'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="mb-1 text-xs text-slate-600">{senderName} • {formatDateTime(messageEntry.createdAt)}</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{messageEntry.message}</p>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {pagination && pagination.pages > 1 && (
          <section className="workspace-panel p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">{t('adminInquiriesPageOf', `Page ${pagination.page} of ${pagination.pages}`).replace('{page}', String(pagination.page)).replace('{pages}', String(pagination.pages))}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={pagination.page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('adminUsersPrevious', 'Prev')}
                </button>

                <button
                  onClick={() => setPage((currentPage) => Math.min(pagination.pages, currentPage + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('adminUsersNext', 'Next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default AdminInquiries
