import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Home,
  MapPin,
  Coins,
  Calendar,
  User
} from 'lucide-react'
import { adminAPI, propertyAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatXaf, formatXafPerMonth } from '../../utils/currency'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const PropertiesManagement = () => {
  const [language, setLanguage] = useState('en')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const t = (key, fallback) => translate(language, key, fallback)
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'

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

  const updatePropertyStatusMutation = useMutation(
    ({ propertyId, listingStatus }) => propertyAPI.updateProperty(propertyId, { listingStatus }),
    {
      onSuccess: () => {
        toast.success(t('adminPropertiesToastStatusUpdated', 'Property status updated successfully'))
        queryClient.invalidateQueries('adminProperties')
        queryClient.invalidateQueries('adminDashboard')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminPropertiesErrorStatusUpdate', 'Failed to update property status'))
      }
    }
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const queryClient = useQueryClient()

  // Fetch properties
  const { data: propertiesData, isLoading } = useQuery(
    ['adminProperties', currentPage, searchTerm, selectedStatus],
    () => adminAPI.getProperties({
      page: currentPage,
      limit: 10,
      search: searchTerm,
      isActive: selectedStatus === 'active' ? true : undefined,
      isApproved: selectedStatus === 'pending' ? false : undefined,
      listingStatus: selectedStatus === 'rented' ? 'taken' : undefined
    }),
    {
      select: (response) => response.data.data
    }
  )

  const properties = propertiesData?.properties || []
  const pagination = propertiesData?.pagination || {}

  // Delete property mutation
  const deletePropertyMutation = useMutation(
    adminAPI.deleteProperty,
    {
      onSuccess: () => {
        toast.success(t('adminPropertiesToastDeleted', 'Property deleted successfully!'), {
          duration: 4000,
          icon: '✅',
        })
        setShowDeleteModal(false)
        setSelectedProperty(null)
        setDeleteReason('')
        queryClient.invalidateQueries('adminProperties')
        queryClient.invalidateQueries('adminDashboard')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminPropertiesErrorDelete', 'Failed to delete property'), {
          duration: 4000,
          icon: '❌',
        })
      }
    }
  )

  const handleDeleteProperty = () => {
    if (!selectedProperty) return
    
    deletePropertyMutation.mutate(selectedProperty._id)
  }

  const openDeleteModal = (property) => {
    setSelectedProperty(property)
    setShowDeleteModal(true)
  }

  const getStatusColor = (property) => {
    if (!property.isActive) return 'bg-red-100 text-red-800'
    if (!property.isApproved) return 'bg-yellow-100 text-yellow-800'
    if (property.listingStatus === 'taken') return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (property) => {
    if (!property.isActive) return t('adminPropertiesStatusInactive', 'Inactive')
    if (!property.isApproved) return t('adminPropertiesStatusPending', 'Pending')
    if (property.listingStatus === 'taken') return t('adminPropertiesStatusRented', 'Rented')
    return t('adminPropertiesStatusActive', 'Active')
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-center gap-1 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0">
            <h1 className="text-xl font-semibold text-gray-900">{t('adminPropertiesTitle', 'Properties Management')}</h1>
            <div className="text-sm text-gray-500">
              {t('adminPropertiesTotalCount', '{total} total properties').replace('{total}', String(pagination.total || 0))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('adminPropertiesSearchPlaceholder', 'Search properties by title, location, or landlord...')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">{t('adminUsersAllStatus', 'All Status')}</option>
                <option value="active">{t('adminPropertiesStatusActive', 'Active')}</option>
                <option value="pending">{t('adminPropertiesStatusPending', 'Pending')}</option>
                <option value="inactive">{t('adminPropertiesStatusInactive', 'Inactive')}</option>
                <option value="rented">{t('adminPropertiesStatusRented', 'Rented')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {properties.length === 0 ? (
            <div className="p-8 text-center">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('adminPropertiesEmptyTitle', 'No properties found')}</h3>
              <p className="text-gray-600">
                {searchTerm || selectedStatus !== 'all' 
                  ? t('adminPropertiesAdjustFilters', 'Try adjusting your search or filters') 
                  : t('adminPropertiesNoneYet', 'No properties have been added yet')
                }
              </p>
            </div>
          ) : (
              <>
              <div className="md:hidden space-y-3 p-3">
                {properties.map((property) => (
                  <article key={property._id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                        {property.images && property.images.length > 0 ? (
                          <img
                            className="h-full w-full object-cover"
                            src={property.images[0].url}
                            alt={property.title}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Home className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{property.title}</p>
                        <p className="mt-0.5 flex items-center text-xs text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {property.location?.city || t('adminPropertiesNoLocation', 'No location')}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property)}`}>
                        {getStatusText(property)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t('adminPropertyLandlord', 'Landlord')}</p>
                        <p className="text-gray-900 truncate">{property.landlord?.name || t('adminCommonUnknown', 'Unknown')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('adminPropertyPrice', 'Price')}</p>
                        <p className="text-gray-900">{formatXaf(property.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('adminPropertiesCreated', 'Created')}</p>
                        <p className="text-gray-900">{formatDate(property.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('adminPropertiesType', 'Type')}</p>
                        <p className="text-gray-900 truncate">{property.type || t('adminPropertiesNA', 'N/A')} • {property.bedrooms || 0} {t('adminPropertiesBed', 'bed')}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => window.open(`/properties/${property._id}`, '_blank')}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                        title={t('adminPropertiesViewProperty', 'View Property')}
                      >
                        <Eye className="h-4 w-4" />
                        {t('adminPropertiesViewProperty', 'View Property')}
                      </button>
                      {property.listingStatus === 'taken' && (
                        <button
                          onClick={() => updatePropertyStatusMutation.mutate({
                            propertyId: property._id,
                            listingStatus: 'available'
                          })}
                          className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
                          title={t('adminPropertiesRelistProperty', 'Re-list Property')}
                        >
                          {t('adminPropertiesRelist', 'Re-list')}
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(property)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700"
                        title={t('adminPropertiesDeleteProperty', 'Delete Property')}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('adminPropertiesDeleteProperty', 'Delete Property')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminCommonProperty', 'Property')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPropertyLandlord', 'Landlord')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPropertyPrice', 'Price')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminStatus', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminPropertiesCreated', 'Created')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminActions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property) => (
                    <tr key={property._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {property.images && property.images.length > 0 ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={property.images[0].url}
                                alt={property.title}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Home className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {property.title}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {property.location?.city || t('adminPropertiesNoLocation', 'No location')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {property.landlord?.name || t('adminCommonUnknown', 'Unknown')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {property.landlord?.email || t('adminInquiriesNoEmail', 'No email')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Coins className="h-3 w-3 mr-1" />
                          {formatXaf(property.price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {property.type || t('adminPropertiesNA', 'N/A')} • {property.bedrooms || 0} {t('adminPropertiesBed', 'bed')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property)}`}>
                          {getStatusText(property)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(property.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => window.open(`/properties/${property._id}`, '_blank')}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title={t('adminPropertiesViewProperty', 'View Property')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {property.listingStatus === 'taken' && (
                            <button
                              onClick={() => updatePropertyStatusMutation.mutate({
                                propertyId: property._id,
                                listingStatus: 'available'
                              })}
                              className="text-emerald-500 hover:text-emerald-700 p-1 rounded"
                              title={t('adminPropertiesRelistProperty', 'Re-list Property')}
                            >
                              <span className="text-xs font-medium">{t('adminPropertiesRelist', 'Re-list')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteModal(property)}
                            className="text-red-400 hover:text-red-600 p-1 rounded"
                            title={t('adminPropertiesDeleteProperty', 'Delete Property')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('adminUsersPrevious', 'Previous')}
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('adminUsersNext', 'Next')}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t('adminPropertiesShowingResults', 'Showing {start} to {end} of {total} results')
                        .replace('{start}', String((currentPage - 1) * 10 + 1))
                        .replace('{end}', String(Math.min(currentPage * 10, pagination.total || 0)))
                        .replace('{total}', String(pagination.total || 0))}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t('adminUsersPrevious', 'Previous')}
                      </button>
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-primary border-primary text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                        disabled={currentPage === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t('adminUsersNext', 'Next')}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowDeleteModal(false)}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {t('adminPropertiesDeleteProperty', 'Delete Property')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('adminPropertiesConfirmDelete', 'Are you sure you want to delete this property? This action cannot be undone.')}
                      </p>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{selectedProperty.title}</p>
                        <p className="text-sm text-gray-600">{selectedProperty.location?.city || t('adminPropertiesNoLocation', 'No location')}</p>
                        <p className="text-sm text-gray-600">{formatXafPerMonth(selectedProperty.price)}</p>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('adminPropertiesDeleteReasonOptional', 'Reason for deletion (optional)')}
                        </label>
                        <textarea
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={t('adminPropertiesDeleteReasonPlaceholder', 'e.g., Policy violation, inappropriate content, etc.')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteProperty}
                  disabled={deletePropertyMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {deletePropertyMutation.isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    t('adminPropertiesDeleteProperty', 'Delete Property')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedProperty(null)
                    setDeleteReason('')
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('adminLandlordsCancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertiesManagement
