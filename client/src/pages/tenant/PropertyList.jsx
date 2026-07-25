import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { 
  Search, 
  Menu,
  Filter, 
  MapPin, 
  Home as HomeIcon, 
  BedDouble,
  Bath,
  Heart,
  Star,
  ChevronDown,
  Video
} from 'lucide-react'
import { propertyAPI, favoriteAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatPropertyPrice } from '../../utils/currency'
import { getVideoThumbnailUrl } from '../../utils/video'

const PropertyList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState(new Set())
  const { user } = useAuth()

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    propertyCategory: searchParams.get('propertyCategory') || '',
    propertyType: searchParams.get('propertyType') || '',
    rentalType: searchParams.get('rentalType') || '',
    roomType: searchParams.get('roomType') || '',
    checkInDate: searchParams.get('checkInDate') || '',
    checkOutDate: searchParams.get('checkOutDate') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    amenities: searchParams.get('amenities')
      ? searchParams.get('amenities').split(',').map((item) => item.trim()).filter(Boolean)
      : [],
    verifiedOnly: searchParams.get('verifiedOnly') || 'true',
    availability: searchParams.get('availability') || 'available',
    sortBy: searchParams.get('sortBy') || '',
    sortDirection: searchParams.get('sortDirection') || 'desc',
    page: parseInt(searchParams.get('page')) || 1
  })

  const sortOption = useMemo(() => {
    if (filters.sortBy === 'price' && filters.sortDirection === 'asc') return 'price_low_high'
    if (filters.sortBy === 'price' && filters.sortDirection === 'desc') return 'price_high_low'
    if (filters.sortBy === 'rental_relevance') return 'rental_type_relevance'
    return 'newest'
  }, [filters.sortBy, filters.sortDirection])

  const cities = ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe']
  const propertyCategories = ['residential', 'commercial', 'hospitality']
  const rentalTypes = ['daily', 'weekly', 'monthly', 'yearly']
  const propertyTypes = [
    'studio', 'apartment', 'house', 'villa',
    'office', 'shop', 'warehouse',
    'hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment',
    'commercial'
  ]
  const roomTypes = ['Single', 'Double', 'Twin', 'Suite', 'Family', 'Deluxe']
  const availableAmenities = [
    'Parking', 'Security', 'Water', 'Electricity', 'Air Conditioning', 'Furnished', 'WiFi', 'Kitchen',
    'Swimming Pool', 'Gym', 'Room Service', 'Housekeeping', 'Conference Room', 'Generator'
  ]

  // Fetch properties
  const { data: propertiesData, isLoading, refetch } = useQuery(
    ['properties', filters],
    () => propertyAPI.getProperties({
      ...filters,
      amenities: Array.isArray(filters.amenities) ? filters.amenities.join(',') : ''
    }),
    {
      keepPreviousData: true,
      staleTime: 10 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
      refetchOnMount: false,
      select: (response) => response.data.data
    }
  )

  // Fetch favorites if user is logged in
  useQuery(
    'favorites',
    favoriteAPI.getFavorites,
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnMount: false,
      select: (response) => response.data.data.favorites,
      onSuccess: (data) => {
        const favIds = new Set(data.map(fav => fav.propertyId._id))
        setFavorites(favIds)
      }
    }
  )

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) params.append(key, value.join(','))
        return
      }
      if (value) params.append(key, value)
    })
    setSearchParams(params)
  }, [filters, setSearchParams])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    refetch()
  }

  const handleAmenityToggle = (amenity) => {
    setFilters((prev) => {
      const exists = prev.amenities.includes(amenity)
      const amenities = exists
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity]

      return {
        ...prev,
        amenities,
        page: 1
      }
    })
  }

  const handleSortChange = (value) => {
    if (value === 'price_low_high') {
      setFilters((prev) => ({ ...prev, sortBy: 'price', sortDirection: 'asc', page: 1 }))
      return
    }
    if (value === 'price_high_low') {
      setFilters((prev) => ({ ...prev, sortBy: 'price', sortDirection: 'desc', page: 1 }))
      return
    }
    if (value === 'rental_type_relevance') {
      setFilters((prev) => ({ ...prev, sortBy: 'rental_relevance', sortDirection: 'desc', page: 1 }))
      return
    }
    setFilters((prev) => ({ ...prev, sortBy: '', sortDirection: 'desc', page: 1 }))
  }

  const toggleFavorite = async (propertyId) => {
    if (!user) {
      toast.error('Please login to save favorites')
      return
    }

    try {
      if (favorites.has(propertyId)) {
        await favoriteAPI.removeFavorite(propertyId)
        setFavorites(prev => {
          const newFavorites = new Set(prev)
          newFavorites.delete(propertyId)
          return newFavorites
        })
        toast.success('Removed from favorites')
      } else {
        await favoriteAPI.addFavorite(propertyId)
        setFavorites(prev => new Set(prev).add(propertyId))
        toast.success('Added to favorites')
      }
    } catch (error) {
      toast.error('Failed to update favorites')
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      city: '',
      propertyCategory: '',
      propertyType: '',
      rentalType: '',
      roomType: '',
      checkInDate: '',
      checkOutDate: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      amenities: [],
      verifiedOnly: 'true',
      availability: 'available',
      sortBy: '',
      sortDirection: 'desc',
      page: 1
    })
  }

  const { properties, pagination } = propertiesData || {}

  const sortedProperties = useMemo(() => {
    const list = Array.isArray(properties) ? [...properties] : []
    if (sortOption !== 'rental_type_relevance') return list

    const requestedRentalType = filters.rentalType
    const fallbackOrder = ['monthly', 'yearly', 'weekly', 'daily']

    return list.sort((a, b) => {
      const typeA = a?.rentalType || 'monthly'
      const typeB = b?.rentalType || 'monthly'

      const rankA = requestedRentalType
        ? (typeA === requestedRentalType ? 0 : 1)
        : (fallbackOrder.indexOf(typeA) === -1 ? 99 : fallbackOrder.indexOf(typeA))
      const rankB = requestedRentalType
        ? (typeB === requestedRentalType ? 0 : 1)
        : (fallbackOrder.indexOf(typeB) === -1 ? 99 : fallbackOrder.indexOf(typeB))

      if (rankA !== rankB) return rankA - rankB

      const dateA = new Date(a?.createdAt || 0).getTime()
      const dateB = new Date(b?.createdAt || 0).getTime()
      return dateB - dateA
    })
  }, [properties, sortOption, filters.rentalType])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Rental</h1>
          <p className="text-gray-600">Browse verified long-term rentals and short-term accommodation providers across Cameroon</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                aria-label="Toggle filters"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex-1 flex items-center">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search by city, hotel name, guest house, or property type..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button type="submit" className="btn-primary">
              Search
            </button>
          </div>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary-hover"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Category</label>
                <select
                  value={filters.propertyCategory}
                  onChange={(e) => handleFilterChange('propertyCategory', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  {propertyCategories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Types</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rental Type</label>
                <select
                  value={filters.rentalType}
                  onChange={(e) => handleFilterChange('rentalType', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Rental Types</option>
                  {rentalTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Type (Accommodation)</label>
                <select
                  value={filters.roomType}
                  onChange={(e) => handleFilterChange('roomType', e.target.value)}
                  className="input-field"
                >
                  <option value="">Any room type</option>
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in date</label>
                <input
                  type="date"
                  value={filters.checkInDate}
                  onChange={(e) => handleFilterChange('checkInDate', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out date</label>
                <input
                  type="date"
                  value={filters.checkOutDate}
                  onChange={(e) => handleFilterChange('checkOutDate', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (XAF)</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Min price"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (XAF)</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Max price"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                  className="input-field"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Bedroom' : 'Bedrooms'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 p-3">
                  {availableAmenities.map((amenity) => {
                    const selected = filters.amenities.includes(amenity)
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {amenity}
                      </button>
                    )
                  })}
                </div>
                {filters.amenities.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">{filters.amenities.length} amenities selected</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verified Properties</label>
                <select
                  value={filters.verifiedOnly}
                  onChange={(e) => handleFilterChange('verifiedOnly', e.target.value)}
                  className="input-field"
                >
                  <option value="true">Verified only</option>
                  <option value="false">All listings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                <select
                  value={filters.availability}
                  onChange={(e) => handleFilterChange('availability', e.target.value)}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="available">Available</option>
                  <option value="taken">Taken</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {pagination?.total || 0} properties found
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort</label>
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value)}
              className="input-field py-2"
            >
              <option value="newest">Newest</option>
              <option value="price_low_high">Price: Low to High</option>
              <option value="price_high_low">Price: High to Low</option>
              <option value="rental_type_relevance">Rental Type Relevance</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : properties?.length === 0 ? (
          <div className="text-center py-12">
            <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600">Try adjusting your filters for rentals or hotels and guest houses</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {sortedProperties?.map((property) => (
                (() => {
                  const coverImage = property.images?.[0] || getVideoThumbnailUrl(property.videos?.[0])
                  return (
                <Link 
                  key={property._id} 
                  to={`/properties/${property._id}`}
                  className="property-card group block hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="relative">
                    {coverImage && (
                      <img
                        src={coverImage}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(property._id)
                      }}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`h-4 w-4 ${favorites.has(property._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                    <div className="absolute bottom-4 left-4">
                      <div className="flex items-center gap-2">
                        <span className="badge-primary bg-white text-gray-900 capitalize">
                          {property.propertyType}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white capitalize">
                          {property.rentalType || 'monthly'}
                        </span>
                      </div>
                    </div>
                    {property.listingStatus === 'taken' && (
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">
                          Taken
                        </span>
                      </div>
                    )}
                    {Array.isArray(property.videos) && property.videos.length > 0 && (
                      <div className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-medium text-white">
                        <Video className="h-3 w-3" />
                        {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {property.title}
                    </h3>
                    
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{property.location.city}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-primary font-bold text-xl">{formatPropertyPrice(property)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <BedDouble className="h-4 w-4 mr-1" />
                        {property.bedrooms} beds
                      </div>
                      <div className="flex items-center">
                        <Bath className="h-4 w-4 mr-1" />
                        {property.bathrooms} baths
                      </div>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1" />
                        {property.views}
                      </div>
                    </div>
                  </div>
                </Link>
                  )
                })()
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handleFilterChange('page', i + 1)}
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
                    onClick={() => handleFilterChange('page', pagination.page + 1)}
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

export default PropertyList
