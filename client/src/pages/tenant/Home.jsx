import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { 
  Search, 
  MapPin, 
  Home as HomeIcon, 
  Building, 
  Star,
  ArrowRight,
  Shield,
  Users,
  TrendingUp,
  Video
} from 'lucide-react'
import { propertyAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatPropertyPrice } from '../../utils/currency'
import { getVideoThumbnailUrl } from '../../utils/video'

const Home = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const dashboardRoute = user
    ? user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'landlord'
        ? '/landlord/dashboard'
        : '/tenant/dashboard'
    : '/login'

  const { data: featuredProperties, isLoading } = useQuery(
    'featuredProperties',
    () => propertyAPI.getProperties({ limit: 6, sort: '-createdAt' }),
    {
      select: (response) => response.data.properties
    }
  )

  const cities = ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua']

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.append('search', searchQuery)
    if (selectedCity) params.append('city', selectedCity)
    const queryString = params.toString()
    navigate(queryString ? `/properties?${queryString}` : '/properties')
  }

  const handleGetStarted = async (event) => {
    event.preventDefault()

    if (user) {
      await logout()
      navigate('/login', { replace: true })
      return
    }

    navigate('/register', { replace: true })
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primaryHover text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
                Find Your Perfect Home in Cameroon
              </h1>
              <p className="text-base sm:text-xl md:text-2xl mb-8 text-white text-opacity-90">
                Discover verified rental properties from trusted landlords
              </p>
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
                  <div className="flex-1 flex items-center px-4 min-w-0">
                    <Search className="h-5 w-5 text-gray-400 mr-3" />
                    <input
                      type="text"
                      placeholder="Search by location, property type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center px-4 border-t border-gray-200 lg:border-t-0 lg:border-l lg:ml-0 lg:pl-4 w-full lg:w-auto">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="py-3 text-gray-900 focus:outline-none bg-transparent w-full"
                    >
                      <option value="">All Cities</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:flex lg:w-auto lg:ml-auto">
                    <button
                      type="submit"
                      className="btn-primary whitespace-nowrap w-full"
                    >
                      Search Properties
                    </button>
                    <Link to="/register" onClick={handleGetStarted} className="btn-primary whitespace-nowrap w-full">
                      Get Started
                    </Link>
                    <Link to={dashboardRoute} className="btn-primary whitespace-nowrap w-full">
                      {user ? 'Dashboard' : 'Sign In'}
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
            <div className="text-center">
              <div className="bg-primary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">500+</h3>
              <p className="text-gray-600">Verified Properties</p>
            </div>
            <div className="text-center">
              <div className="bg-secondary bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">1000+</h3>
              <p className="text-gray-600">Happy Tenants</p>
            </div>
            <div className="text-center">
              <div className="bg-accent bg-opacity-10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">100%</h3>
              <p className="text-gray-600">Verified Landlords</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">24/7</h3>
              <p className="text-gray-600">Support Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How CAMRENT Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and transparent rental process designed for Cameroon
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-4">
                <div className="bg-primary bg-opacity-10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Search & Browse</h3>
                <p className="text-gray-600">
                  Browse through verified properties in your preferred location and price range
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-4">
                <div className="bg-secondary bg-opacity-10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                  <HomeIcon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Contact Landlords</h3>
                <p className="text-gray-600">
                  Connect directly with verified landlords to schedule viewings and ask questions
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-4">
                <div className="bg-accent bg-opacity-10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Rent with Confidence</h3>
                <p className="text-gray-600">
                  All landlords are verified, ensuring a safe and reliable rental experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Link to="/properties" className="btn-primary inline-flex items-center whitespace-nowrap mb-4">
              View All Properties
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-gray-600">Discover our latest verified rental properties</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties?.map((property) => (
                <Link key={property._id} to={`/properties/${property._id}`} className="property-card">
                  <div className="aspect-w-16 aspect-h-10 bg-gray-200">
                    {(property.images?.[0] || getVideoThumbnailUrl(property.videos?.[0])) && (
                      <img
                        src={property.images?.[0] || getVideoThumbnailUrl(property.videos?.[0])}
                        alt={property.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    {Array.isArray(property.videos) && property.videos.length > 0 && (
                      <div className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-medium text-white">
                        <Video className="h-3 w-3" />
                        {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">
                        {property.title}
                      </h3>
                      <span className="badge-primary">
                        {property.propertyType}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{property.location.city}, {property.location.address}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-primary font-bold text-xl">{formatPropertyPrice(property)}</p>
                      <div className="flex items-center text-gray-600 text-sm">
                        <HomeIcon className="h-4 w-4 mr-1" />
                        {property.bedrooms} beds
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Star className="h-4 w-4 mr-1" />
                        {property.views} views
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(property.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}

export default Home
