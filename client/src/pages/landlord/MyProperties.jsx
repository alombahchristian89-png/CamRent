import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MessageSquare,
  Calendar,
  MapPin,
  Home as HomeIcon,
  Coins,
  Video,
  Filter,
  Search,
  AlertTriangle,
  X
} from 'lucide-react'
import { propertyAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatXaf } from '../../utils/currency'
import { getVideoThumbnailUrl } from '../../utils/video'

const MyProperties = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState(null)
  const queryClient = useQueryClient()
  const { isVerifiedLandlord } = useAuth()

  const { data: propertiesData, isLoading } = useQuery(
    ['landlordProperties', { search: searchQuery, status: filterStatus }],
    () => propertyAPI.getLandlordProperties({ search: searchQuery, status: filterStatus }),
    {
      select: (response) => response.data.data
    }
  )

  const deletePropertyMutation = useMutation(
    propertyAPI.deleteProperty,
    {
      onSuccess: () => {
        toast.success('Property deleted successfully')
        queryClient.invalidateQueries('landlordProperties')
        queryClient.invalidateQueries('landlordDashboard')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete property')
      }
    }
  )

  const updateListingStatusMutation = useMutation(
    ({ propertyId, listingStatus }) => propertyAPI.updateProperty(propertyId, { listingStatus }),
    {
      onSuccess: (_, variables) => {
        const successMessage = variables.listingStatus === 'taken'
          ? 'Property marked as rented successfully. It has been removed from public listings.'
          : 'Property relisted successfully and is available again.'

        toast.success(successMessage)
        queryClient.invalidateQueries('landlordProperties')
        queryClient.invalidateQueries('properties')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update property status')
      }
    }
  )

  const handleDeleteProperty = (propertyId) => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      deletePropertyMutation.mutate(propertyId)
    }
  }

  const handleListingStatusToggle = (property) => {
    const currentStatus = property.listingStatus === 'taken' ? 'taken' : 'available'
    const nextStatus = currentStatus === 'taken' ? 'available' : 'taken'

    setPendingStatusChange({ property, nextStatus })
    setShowStatusModal(true)
  }

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return

    updateListingStatusMutation.mutate({
      propertyId: pendingStatusChange.property._id,
      listingStatus: pendingStatusChange.nextStatus
    })

    setShowStatusModal(false)
    setPendingStatusChange(null)
  }

  const handleCancelStatusChange = () => {
    setShowStatusModal(false)
    setPendingStatusChange(null)
  }

  const { properties, pagination } = propertiesData || {}

  if (!isVerifiedLandlord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h2>
          <p className="text-gray-600 mb-6">
            You need to complete verification before you can manage properties.
          </p>
          <Link to="/landlord/verification" className="btn-primary">
            Complete Verification
          </Link>
        </div>
      </div>
    )
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Properties</h1>
            <p className="text-gray-600">Manage your property listings</p>
          </div>
          <Link to="/landlord/properties/add" className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex items-center">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full focus:outline-none"
              />
            </div>
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-3" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="all">All Properties</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="available">Available</option>
                <option value="taken">Taken</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties List */}
        {properties?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No properties listed yet</h2>
            <p className="text-gray-600 mb-6">
              Start by adding your first property to connect with potential tenants
            </p>
            <Link to="/landlord/properties/add" className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Property
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {properties?.map((property) => (
              <div key={property._id} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Property Image */}
                  <div className="relative lg:w-64">
                    {(property.images?.[0] || getVideoThumbnailUrl(property.videos?.[0])) ? (
                      <img
                        src={property.images?.[0] || getVideoThumbnailUrl(property.videos?.[0])}
                        alt={property.title}
                        className="w-full h-48 lg:h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 lg:h-full bg-gray-200 flex items-center justify-center">
                        <Building className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    {Array.isArray(property.videos) && property.videos.length > 0 && (
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-medium text-white">
                        <Video className="h-3 w-3" />
                        {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.location.city}, {property.location.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${
                          property.isActive ? 'badge-success' : 'badge-danger'
                        }`}>
                          {property.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`badge ${
                          property.listingStatus === 'taken' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {property.listingStatus === 'taken' ? 'Rented' : 'Available'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Coins className="h-5 w-5 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium">{formatXaf(property.price)}</p>
                        <p className="text-xs text-gray-500">per month</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <HomeIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                        <p className="text-sm font-medium">{property.bedrooms} Beds</p>
                        <p className="text-xs text-gray-500">{property.bathrooms} Baths</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Eye className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                        <p className="text-sm font-medium">{property.views}</p>
                        <p className="text-xs text-gray-500">Views</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                        <p className="text-sm font-medium">{property.inquiries}</p>
                        <p className="text-xs text-gray-500">Inquiries</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Listed {new Date(property.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/properties/${property._id}`}
                          className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg"
                          title="View Property"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/landlord/properties/edit/${property._id}`}
                          className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg"
                          title="Edit Property"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleListingStatusToggle(property)}
                          disabled={updateListingStatusMutation.isLoading}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            property.listingStatus === 'taken'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          }`}
                          title={property.listingStatus === 'taken' ? 'Re-list Property' : 'Mark as Rented'}
                        >
                          {property.listingStatus === 'taken' ? 'Re-list Property' : 'Mark as Rented'}
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(property._id)}
                          disabled={deletePropertyMutation.isLoading || updateListingStatusMutation.isLoading}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete Property"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showStatusModal && pendingStatusChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start">
                <div className="mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {pendingStatusChange.nextStatus === 'taken' ? 'Mark Property as Rented?' : 'Re-list Property?'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">Update your listing availability</p>
                    </div>
                    <button
                      onClick={handleCancelStatusChange}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {pendingStatusChange.nextStatus === 'taken'
                      ? 'This property will no longer appear in public search results or be available for new inquiries. Existing conversations and records will remain accessible.'
                      : 'This property will become visible again in public search results and available for new inquiries.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCancelStatusChange}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStatusChange}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  {pendingStatusChange.nextStatus === 'taken' ? 'Confirm' : 'Re-list Property'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', pagination.page - 1)
                  window.location.search = params.toString()
                }}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    params.set('page', i + 1)
                    window.location.search = params.toString()
                  }}
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
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', pagination.page + 1)
                  window.location.search = params.toString()
                }}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyProperties
