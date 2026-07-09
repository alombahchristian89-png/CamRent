import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  Heart, 
  MapPin, 
  Home as HomeIcon, 
  Eye,
  Calendar,
  MessageSquare,
  Video
} from 'lucide-react'
import { favoriteAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatPropertyPrice } from '../../utils/currency'
import { getVideoThumbnailUrl } from '../../utils/video'

const Favorites = () => {
  const queryClient = useQueryClient()

  const { data: favoritesData, isLoading } = useQuery(
    'favorites',
    favoriteAPI.getFavorites,
    {
      select: (response) => response.data.data
    }
  )

  const removeFavoriteMutation = useMutation(
    favoriteAPI.removeFavorite,
    {
      onSuccess: () => {
        toast.success('Removed from favorites')
        queryClient.invalidateQueries('favorites')
        queryClient.invalidateQueries(['favoriteStatus'])
      },
      onError: () => {
        toast.error('Failed to remove from favorites')
      }
    }
  )

  const handleRemoveFavorite = (propertyId) => {
    removeFavoriteMutation.mutate(propertyId)
  }

  const { favorites, pagination } = favoritesData || {}

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600">Properties you&apos;ve saved for later</p>
        </div>

        {favorites?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-6">
              Start browsing and save properties that interest you
            </p>
            <Link to="/properties" className="btn-primary">
              Browse Properties
            </Link>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                {pagination?.total || 0} saved properties
              </p>
            </div>

            {/* Favorites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites?.map((favorite) => (
                <div key={favorite._id} className="property-card group relative">
                  <button
                    onClick={() => handleRemoveFavorite(favorite.propertyId._id)}
                    className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-red-50 group"
                    disabled={removeFavoriteMutation.isLoading}
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" />
                  </button>

                  <Link to={`/properties/${favorite.propertyId._id}`}>
                    <div className="relative">
                      {(favorite.propertyId.images?.[0] || getVideoThumbnailUrl(favorite.propertyId.videos?.[0])) && (
                        <img
                          src={favorite.propertyId.images?.[0] || getVideoThumbnailUrl(favorite.propertyId.videos?.[0])}
                          alt={favorite.propertyId.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="absolute bottom-4 left-4">
                        <span className="badge-primary bg-white text-gray-900">
                          {favorite.propertyId.propertyType}
                        </span>
                      </div>
                      {Array.isArray(favorite.propertyId.videos) && favorite.propertyId.videos.length > 0 && (
                        <div className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-medium text-white">
                          <Video className="h-3 w-3" />
                          {favorite.propertyId.videos.length} video{favorite.propertyId.videos.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-6">
                    <Link to={`/properties/${favorite.propertyId._id}`}>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1 hover:text-primary transition-colors">
                        {favorite.propertyId.title}
                      </h3>
                    </Link>

                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{favorite.propertyId.location.city}</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <p className="text-primary font-bold text-xl">{formatPropertyPrice(favorite.propertyId)}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <HomeIcon className="h-3 w-3 mr-1" />
                        {favorite.propertyId.bedrooms} beds
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {favorite.propertyId.inquiries}
                      </div>
                      <div className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {favorite.propertyId.views}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        Saved {new Date(favorite.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/properties/${favorite.propertyId._id}`}
                          className="text-primary hover:text-primary-hover text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  )
}

export default Favorites
