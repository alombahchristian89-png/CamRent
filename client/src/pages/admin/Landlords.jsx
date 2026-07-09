import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Filter,
  FileText,
  User
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const formatShortId = (idValue) => String(idValue ?? '').slice(-8)
const resolveDocumentUrl = (doc) => {
  if (typeof doc === 'string') return doc
  if (doc && typeof doc === 'object') {
    return doc.url || doc.path || doc.secure_url || ''
  }
  return ''
}

const isViewableUrl = (url) => /^https?:\/\//i.test(String(url || ''))

const AdminLandlords = () => {
  const [language, setLanguage] = useState('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [viewingLandlord, setViewingLandlord] = useState(null)
  const [verificationAction, setVerificationAction] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const queryClient = useQueryClient()

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

  const verificationStatusLabel = (status) => {
    if (status === 'approved') return t('adminLandlordsStatusApproved', 'Approved')
    if (status === 'rejected') return t('adminLandlordsStatusRejected', 'Rejected')
    return t('adminLandlordsStatusPending', 'Pending')
  }

  const { data: landlordsData, isLoading } = useQuery(
    ['adminLandlords', { page, search: searchQuery, status: filterStatus }],
    () => adminAPI.getLandlords({ page, search: searchQuery, status: filterStatus }),
    {
      select: (response) => response.data.data
    }
  )

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
    setPage(1)
  }

  const handleStatusChange = (event) => {
    setFilterStatus(event.target.value)
    setPage(1)
  }

  const verifyMutation = useMutation(
    ({ id, status, rejectionReason, adminNotes }) => adminAPI.verifyLandlord(id, { status, rejectionReason, adminNotes }),
    {
      onSuccess: () => {
        const actionLabel = verificationAction === 'approved'
          ? t('adminLandlordsActionApproved', 'approved')
          : t('adminLandlordsActionRejected', 'rejected')
        toast.success(t('adminLandlordsToastStatusUpdated', `Landlord ${actionLabel} successfully`).replace('{action}', actionLabel))
        queryClient.invalidateQueries('adminLandlords')
        queryClient.invalidateQueries('adminDashboard')
        setVerificationAction(null)
        setRejectionReason('')
        setAdminNotes('')
        setViewingLandlord(null)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminLandlordsErrorUpdateStatus', 'Failed to update verification status'))
      }
    }
  )

  const handleVerify = (landlord, action) => {
    setViewingLandlord(landlord)
    setVerificationAction(action)
    setAdminNotes(landlord.adminNotes || '')
  }

  const confirmVerification = () => {
    if (verificationAction === 'rejected' && !rejectionReason.trim()) {
      toast.error(t('adminLandlordsProvideRejectionReason', 'Please provide a rejection reason'))
      return
    }
    verifyMutation.mutate({
      id: viewingLandlord._id,
      status: verificationAction,
      rejectionReason,
      adminNotes
    })
  }

  const { landlords, pagination } = landlordsData || {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('adminLandlordsTitle', 'Landlord Verification')}</h1>
          <p className="text-gray-600">{t('adminLandlordsDescription', 'Review and verify landlord applications')}</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex items-center">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder={t('adminLandlordsSearchPlaceholder', 'Search landlords...')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full focus:outline-none"
              />
            </div>
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-3" />
              <select
                value={filterStatus}
                onChange={handleStatusChange}
                className="input-field"
              >
                <option value="all">{t('adminLandlordsAll', 'All Landlords')}</option>
                <option value="pending">{t('adminLandlordsStatusPending', 'Pending')}</option>
                <option value="approved">{t('adminLandlordsStatusApproved', 'Approved')}</option>
                <option value="rejected">{t('adminLandlordsStatusRejected', 'Rejected')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Landlords List */}
        {landlords?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('adminLandlordsEmptyTitle', 'No landlords found')}</h2>
            <p className="text-gray-600">
              {filterStatus === 'all' 
                ? t('adminLandlordsEmptyAll', 'No landlords have registered yet.')
                : t('adminLandlordsEmptyByStatus', `No ${filterStatus} landlords found.`).replace('{status}', verificationStatusLabel(filterStatus))
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminLandlordsColumnLandlord', 'Landlord')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminUsersContact', 'Contact')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminStatus', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminLandlordsColumnApplied', 'Applied')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminUsersDocuments', 'Documents')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminActions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {landlords?.map((landlord) => (
                    <tr key={landlord._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{landlord.name}</div>
                            <div className="text-sm text-gray-500">{t('adminUsersIdPrefix', 'ID')}: {formatShortId(landlord._id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{landlord.email}</div>
                        {landlord.phone && (
                          <div className="text-sm text-gray-500">{landlord.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${
                          landlord.verificationStatus === 'approved' ? 'badge-success' :
                          landlord.verificationStatus === 'rejected' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {verificationStatusLabel(landlord.verificationStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(landlord.createdAt).toLocaleDateString(locale)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {landlord.documents?.length || 0} {t('adminLandlordsFiles', 'files')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setViewingLandlord(landlord)}
                            className="text-primary hover:text-primary-hover"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {landlord.verificationStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerify(landlord, 'approved')}
                                className="text-green-600 hover:text-green-800"
                                title={t('adminApprove', 'Approve')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleVerify(landlord, 'rejected')}
                                className="text-red-600 hover:text-red-800"
                                title={t('adminReject', 'Reject')}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('adminUsersPrevious', 'Previous')}
              </button>

              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-2 rounded-lg ${
                    pagination.page === i + 1
                      ? 'bg-primary text-white'
                      : 'border border-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setPage((currentPage) => Math.min(pagination.pages, currentPage + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('adminUsersNext', 'Next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Landlord Details Modal */}
      {viewingLandlord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('adminLandlordsDetailsTitle', 'Landlord Details')}</h2>
                <button
                  onClick={() => {
                    setViewingLandlord(null)
                    setVerificationAction(null)
                    setRejectionReason('')
                    setAdminNotes('')
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{t('adminLandlordsPersonalInfo', 'Personal Information')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{t('adminUsersFullName', 'Name')}</p>
                      <p className="font-medium">{viewingLandlord.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('adminUsersEmail', 'Email')}</p>
                      <p className="font-medium">{viewingLandlord.email}</p>
                    </div>
                    {viewingLandlord.phone && (
                      <div>
                        <p className="text-sm text-gray-500">{t('adminUsersPhone', 'Phone')}</p>
                        <p className="font-medium">{viewingLandlord.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">{t('adminStatus', 'Status')}</p>
                      <span className={`badge ${
                        viewingLandlord.verificationStatus === 'approved' ? 'badge-success' :
                        viewingLandlord.verificationStatus === 'rejected' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {verificationStatusLabel(viewingLandlord.verificationStatus)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{t('adminLandlordsSubmittedDocuments', 'Submitted Documents')}</h3>
                  {viewingLandlord.documents?.length > 0 ? (
                    <div className="space-y-2">
                      {viewingLandlord.documents.map((doc, index) => {
                        const docUrl = resolveDocumentUrl(doc)
                        const canView = isViewableUrl(docUrl)

                        return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm">{t('adminDocument', 'Document')} {index + 1}</span>
                          </div>
                          {canView ? (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-hover text-sm"
                            >
                              {t('adminUsersOpen', 'Open')}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">{t('adminLandlordsLegacyLinkWarning', 'Legacy browser-local file link. It cannot be opened in admin review; ask the landlord to re-upload documents.')}</span>
                          )}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <p className="text-gray-500">{t('adminLandlordsNoDocuments', 'No documents submitted')}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">{t('adminLandlordsInternalNotes', 'Internal Admin Notes')}</h3>
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder={t('adminLandlordsNotesPlaceholder', 'Add private review notes for this verification request...')}
                  />
                </div>

                {/* Verification Actions */}
                {viewingLandlord.verificationStatus === 'pending' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">{t('adminLandlordsVerificationAction', 'Verification Action')}</h3>
                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        <button
                          onClick={() => setVerificationAction('approved')}
                          className={`flex-1 py-2 px-4 rounded-lg border ${
                            verificationAction === 'approved'
                              ? 'bg-green-50 border-green-500 text-green-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4 inline mr-2" />
                          {t('adminApprove', 'Approve')}
                        </button>
                        <button
                          onClick={() => setVerificationAction('rejected')}
                          className={`flex-1 py-2 px-4 rounded-lg border ${
                            verificationAction === 'rejected'
                              ? 'bg-red-50 border-red-500 text-red-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <XCircle className="h-4 w-4 inline mr-2" />
                          {t('adminReject', 'Reject')}
                        </button>
                      </div>

                      {verificationAction === 'rejected' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('adminLandlordsRejectionReason', 'Rejection Reason')}
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                            placeholder={t('adminLandlordsRejectionReasonPlaceholder', 'Please provide a reason for rejection...')}
                          />
                        </div>
                      )}

                      {verificationAction && (
                        <div className="flex space-x-3">
                          <button
                            onClick={confirmVerification}
                            disabled={verifyMutation.isLoading}
                            className="flex-1 btn-primary disabled:opacity-50"
                          >
                            {verifyMutation.isLoading ? <LoadingSpinner size="sm" /> : t('adminLandlordsConfirmAction', 'Confirm Action')}
                          </button>
                          <button
                            onClick={() => {
                              setVerificationAction(null)
                              setRejectionReason('')
                            }}
                            className="flex-1 btn-outline"
                          >
                            {t('adminLandlordsCancel', 'Cancel')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminLandlords
