import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  MapPin, 
  Home as HomeIcon, 
  BedDouble,
  Bath,
  Square,
  Heart,
  Share2,
  Calendar,
  MessageSquare,
  User,
  Check,
  X,
  Star,
  ArrowLeft,
  CheckCircle
} from 'lucide-react'
import { propertyAPI, favoriteAPI, inquiryAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatPropertyPrice, formatXaf } from '../../utils/currency'

const PropertyDetail = () => {
  const { id } = useParams()
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Fetch property details
  const { data: propertyData, isLoading } = useQuery(
    ['property', id],
    () => propertyAPI.getPropertyById(id),
    {
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
      refetchOnMount: false,
      select: (response) => response.data.data.property
    }
  )

  // Check if property is favorited
  const { data: isFavoritedData } = useQuery(
    ['favoriteStatus', id],
    () => favoriteAPI.checkFavorite(id),
    {
      enabled: !!user && !!id,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnMount: false,
      select: (response) => response.data.data.isFavorited
    }
  )

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation(
    (isFavorited) => 
      isFavorited 
        ? favoriteAPI.removeFavorite(id)
        : favoriteAPI.addFavorite(id),
    {
      onSuccess: (_, isFavorited) => {
        toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites')
        queryClient.invalidateQueries(['favoriteStatus', id])
        queryClient.invalidateQueries('favorites')
      },
      onError: () => {
        toast.error('Failed to update favorites')
      }
    }
  )

  // Send inquiry mutation
  const sendInquiryMutation = useMutation(
    inquiryAPI.sendInquiry,
    {
      onSuccess: () => {
        toast.success('Inquiry sent successfully!')
        setShowInquiryModal(false)
        setInquiryMessage('')
        queryClient.invalidateQueries('tenantInquiries')
        queryClient.invalidateQueries('tenantStats')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send inquiry')
      }
    }
  )

  const handleToggleFavorite = () => {
    if (!user) {
      toast.error('Please login to save favorites')
      return
    }
    toggleFavoriteMutation.mutate(isFavoritedData)
  }

  const handleSendInquiry = () => {
    if (!user) {
      toast.error('Please login to send inquiries')
      return
    }
    if (!inquiryMessage.trim()) {
      toast.error('Please enter a message')
      return
    }
    sendInquiryMutation.mutate({
      propertyId: id,
      message: inquiryMessage
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: propertyData?.title,
          text: `Check out this property: ${propertyData?.title}`,
          url: window.location.href
        })
      } catch (error) {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const property = propertyData
  const isTaken = property?.listingStatus === 'taken'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h2>
          <Link to="/properties" className="btn-primary">
            Browse Properties
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/properties" className="flex items-center text-gray-600 hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
              <div className="relative">
                {property.images?.length > 0 && (
                  <>
                    <img
                      src={property.images[currentImageIndex]}
                      alt={property.title}
                      className="w-full h-96 object-cover"
                    />
                    {property.images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {property.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {property.images?.length > 1 && (
                <div className="p-4 flex space-x-2 overflow-x-auto">
                  {property.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        index === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={image} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {Array.isArray(property.videos) && property.videos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Videos</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {property.videos.map((videoUrl, index) => (
                    <div key={`${videoUrl}-${index}`} className="rounded-xl overflow-hidden border border-gray-200 bg-black">
                      <video src={videoUrl} controls autoPlay muted playsInline className="h-64 w-full object-cover" preload="metadata" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Details */}
            <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isTaken ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isTaken ? 'Taken' : 'Available'}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{property.location.city}, {property.location.address}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleToggleFavorite}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Heart
                      className={`h-5 w-5 ${isFavoritedData ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Share2 className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <p className="text-primary font-bold text-2xl">{formatPropertyPrice(property)}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    {property.views} views
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {property.inquiries} inquiries
                  </div>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
                  <p className="mt-1 text-sm font-medium capitalize text-gray-900">{property.propertyCategory || 'residential'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rental Type</p>
                  <p className="mt-1 text-sm font-medium capitalize text-gray-900">{property.rentalType || 'monthly'}</p>
                </div>
                {property.propertyCategory === 'hospitality' && (
                  <>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Check-in / Check-out</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {property.hospitalityInfo?.checkInTime || '--:--'} - {property.hospitalityInfo?.checkOutTime || '--:--'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Room Availability</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {property.hospitalityInfo?.roomsAvailable || 0} rooms, max {property.hospitalityInfo?.maxOccupancy || 0} guests
                      </p>
                    </div>
                  </>
                )}
                {property.propertyCategory === 'residential' && (
                  <>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lease Duration</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {property.residentialInfo?.leaseDurationMonths || 12} months
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Security Deposit</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatXaf(property.residentialInfo?.securityDeposit || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <BedDouble className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-medium">{property.bedrooms} Bedrooms</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Bath className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-medium">{property.bathrooms} Bathrooms</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Square className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-medium">{property.area} m²</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <HomeIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-medium capitalize">{property.propertyType}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              </div>

              {property.amenities?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Available from {new Date(property.availableFrom).toLocaleDateString()}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Landlord Info */}
            <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Landlord Information</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium mr-2">{property.landlord?.name}</p>
                    {property.landlord?.isVerified && (
                      <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {property.landlord?.isVerified ? 'Verified Landlord' : 'Landlord'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (isTaken) {
                    toast.error('This property is already taken and no longer accepting inquiries.')
                    return
                  }
                  setShowInquiryModal(true)
                }}
                className="w-full btn-primary disabled:opacity-60"
                disabled={isTaken}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isTaken ? 'Property Taken' : 'Contact Landlord'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleToggleFavorite}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavoritedData ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  {isFavoritedData ? 'Remove from Favorites' : 'Save to Favorites'}
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4 mr-2 text-gray-400" />
                  Share Property
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {showInquiryModal && !isTaken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contact Landlord</h3>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Send a message to {property.landlord?.name} about this property.
            </p>
            
            <textarea
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              placeholder="Hi, I'm interested in this property. Could you provide more information?"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowInquiryModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInquiry}
                disabled={sendInquiryMutation.isLoading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {sendInquiryMutation.isLoading ? <LoadingSpinner size="sm" /> : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyDetail
