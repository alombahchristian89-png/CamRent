import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import {
  Building,
  Home as HomeIcon,
  MessageSquare,
  TrendingUp,
  Eye,
  PlusCircle,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { landlordAPI, inquiryAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatXaf } from '../../utils/currency'

const LandlordDashboard = () => {
  const { user, isVerifiedLandlord } = useAuth()

  const { data: dashboardData, isLoading } = useQuery(
    'landlordDashboard',
    landlordAPI.getDashboard,
    {
      select: (response) => response.data.data
    }
  )

  const { data: inquiriesData } = useQuery(
    'landlordInquiries',
    () => inquiryAPI.getLandlordInquiries({ limit: 5 }),
    {
      select: (response) => response.data.data
    }
  )

  const { stats, recentProperties } = dashboardData || {}
  const { inquiries } = inquiriesData || {}

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">Manage your properties and connect with tenants</p>
        </div>

        {/* Verification Status Alert */}
        {!isVerifiedLandlord && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Verification Required
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You need to complete verification before you can list properties.
                </p>
              </div>
              <Link
                to="/landlord/verification"
                className="btn-secondary text-sm"
              >
                Complete Verification
              </Link>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-primary bg-opacity-10 rounded-full p-3">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.totalListings || 0}
              </span>
            </div>
            <p className="text-gray-600">Total Listings</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 rounded-full p-3">
                <HomeIcon className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.activeListings || 0}
              </span>
            </div>
            <p className="text-gray-600">Active Listings</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-secondary bg-opacity-10 rounded-full p-3">
                <Eye className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.totalViews?.toLocaleString() || 0}
              </span>
            </div>
            <p className="text-gray-600">Total Views</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-accent bg-opacity-10 rounded-full p-3">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.totalInquiries || 0}
              </span>
            </div>
            <p className="text-gray-600">Total Inquiries</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Properties */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Properties</h2>
              <Link to="/landlord/properties" className="text-primary hover:text-primary-hover flex items-center text-sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {recentProperties?.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No properties listed yet</p>
                {isVerifiedLandlord && (
                  <Link to="/landlord/properties/add" className="btn-primary">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Property
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {recentProperties?.map((property) => (
                  <Link
                    key={property._id}
                    to={`/landlord/properties/edit/${property._id}`}
                    className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {property.title}
                      </h3>
                      <span className="text-primary font-semibold">
                        {formatXaf(property.price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>{property.bedrooms} beds</span>
                        <span>{property.bathrooms} baths</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {property.views}
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {property.inquiries}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Inquiries</h2>
              <Link to="/landlord/inquiries" className="text-primary hover:text-primary-hover flex items-center text-sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {inquiries?.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No inquiries received yet</p>
                <p className="text-sm text-gray-500">
                  Inquiries will appear here when tenants contact you
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inquiries?.map((inquiry) => (
                  <div key={inquiry._id} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {inquiry.tenantId?.name || 'Unknown Tenant'}
                      </h3>
                      <span className={`badge ${
                        inquiry.status === 'responded' ? 'badge-success' :
                        inquiry.status === 'pending' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Re: {inquiry.propertyId?.title || 'Unknown Property'}
                    </p>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {inquiry.message}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                      {!inquiry.landlordResponse && inquiry.status === 'pending' && (
                        <Link
                          to="/landlord/inquiries"
                          className="text-primary hover:text-primary-hover"
                        >
                          Respond
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isVerifiedLandlord ? (
            <>
              <Link
                to="/landlord/properties/add"
                className="bg-white rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow text-center group"
              >
                <PlusCircle className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900 mb-1">Add Property</h3>
                <p className="text-sm text-gray-600">List a new property</p>
              </Link>

              <Link
                to="/landlord/properties"
                className="bg-white rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow text-center group"
              >
                <Building className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900 mb-1">My Properties</h3>
                <p className="text-sm text-gray-600">Manage listings</p>
              </Link>

              <Link
                to="/landlord/inquiries"
                className="bg-white rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow text-center group"
              >
                <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900 mb-1">Inquiries</h3>
                <p className="text-sm text-gray-600">View messages</p>
              </Link>
            </>
          ) : (
            <Link
              to="/landlord/verification"
              className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-primary to-accent rounded-xl p-8 text-white text-center group"
            >
              <Shield className="h-12 w-12 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Complete Your Verification</h3>
              <p className="text-white text-opacity-90 mb-4">
                Get verified to start listing properties and connecting with tenants
              </p>
              <button className="btn-secondary">
                Start Verification
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default LandlordDashboard
