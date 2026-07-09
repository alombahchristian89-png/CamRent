import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { motion } from 'framer-motion'
import {
  Heart,
  MessageSquare,
  TrendingUp,
  Calendar,
  MapPin,
  ArrowRight
} from 'lucide-react'
import { favoriteAPI, inquiryAPI, notificationAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatPropertyPrice } from '../../utils/currency'

const TenantDashboard = () => {
  const { user } = useAuth()

  const [propertyType, setPropertyType] = useState('')
  const [city, setCity] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [requestMessage, setRequestMessage] = useState('')

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery(
    'favorites',
    favoriteAPI.getFavorites,
    {
      select: (response) => response.data.data.favorites,
    }
  )

  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery(
    'tenantInquiries',
    inquiryAPI.getTenantInquiries,
    {
      select: (response) => response.data.data
    }
  )

  const propertyTypes = ['studio', 'apartment', 'house', 'villa', 'commercial']
  const cities = ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe']

  const requestMutation = useMutation(
    (payload) => notificationAPI.sendPropertyRequest(payload),
    {
      onSuccess: () => {
        toast.success('Your property request was sent to verified landlords.')
        setPropertyType('')
        setCity('')
        setMinBudget('')
        setMaxBudget('')
        setRequestMessage('')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send request')
      }
    }
  )

  const handleSubmitRequest = () => {
    if (!propertyType) {
      toast.error('Please choose a property type')
      return
    }
    if (!requestMessage.trim()) {
      toast.error('Please enter your request details')
      return
    }

    requestMutation.mutate({
      propertyType,
      city,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      message: requestMessage.trim()
    })
  }

  const { favorites } = favoritesData || {}
  const { inquiries } = inquiriesData || {}

  const recentFavorites = favorites?.slice(0, 3) || []
  const recentInquiries = inquiries?.slice(0, 3) || []

  if (favoritesLoading || inquiriesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mb-8 rounded-[24px] border border-[#EEF2FF] bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Tenant workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome back, {user?.name}!</h1>
              <p className="mt-2 text-sm text-slate-500">Track favorites, monitor inquiries, and stay ahead of your next move.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primaryLight px-4 py-2 text-sm font-medium text-primary">
              <Heart className="h-4 w-4" />
              {favorites?.total || 0} saved homes
            </div>
          </div>
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[{ icon: Heart, label: 'Saved properties', value: favorites?.total || 0, helper: 'Homes you are keeping on your shortlist', tone: 'violet' }, { icon: MessageSquare, label: 'Inquiries sent', value: inquiries?.total || 0, helper: 'Messages to landlords across your search', tone: 'indigo' }, { icon: TrendingUp, label: 'Responses received', value: inquiries?.filter((item) => item.status === 'responded').length || 0, helper: 'Landlord replies that need your attention', tone: 'emerald' }, { icon: Calendar, label: 'Today', value: new Date().toLocaleDateString(), helper: 'A fresh day for your next property hunt', tone: 'blue' }].map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.25 }} className="dashboard-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${card.tone === 'violet' ? 'bg-blue-50 text-blue-600' : card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : card.tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="dashboard-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Recent favorites</h2>
                <p className="mt-1 text-sm text-slate-500">Properties you have saved for later.</p>
              </div>
              <Link to="/tenant/favorites" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View all <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {recentFavorites.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                <Heart className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="font-semibold text-slate-900">No favorites yet</p>
                <p className="mt-1 text-sm text-slate-500">Browse listings and save the homes you love.</p>
                <Link to="/properties" className="btn-primary mt-4">Browse properties</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFavorites.map((favorite) => (
                  <Link key={favorite._id} to={`/properties/${favorite.propertyId._id}`} className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white">
                    {favorite.propertyId.images?.[0] && <img src={favorite.propertyId.images[0]} alt={favorite.propertyId.title} className="h-16 w-16 rounded-2xl object-cover" />}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{favorite.propertyId.title}</p>
                      <p className="mt-1 flex items-center text-sm text-slate-500"><MapPin className="mr-1 h-3.5 w-3.5" />{favorite.propertyId.location.city}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900">{formatPropertyPrice(favorite.propertyId)}</span>
                        <span className="text-xs text-slate-500">{new Date(favorite.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="dashboard-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Recent inquiries</h2>
                <p className="mt-1 text-sm text-slate-500">The conversations you have open with landlords.</p>
              </div>
              <Link to="/tenant/inquiries" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View all <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {recentInquiries.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="font-semibold text-slate-900">No inquiries yet</p>
                <p className="mt-1 text-sm text-slate-500">Start a conversation with landlords for the homes you love.</p>
                <Link to="/properties" className="btn-primary mt-4">Browse properties</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInquiries.map((inquiry) => (
                  <div key={inquiry._id} className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{inquiry.propertyId.title}</p>
                        <p className="mt-1 text-sm text-slate-500">To: {inquiry.landlordId.name}</p>
                      </div>
                      <span className={`badge ${inquiry.status === 'responded' ? 'badge-success' : inquiry.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{inquiry.status}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{inquiry.message}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                      {inquiry.landlordResponse && <span className="font-semibold text-emerald-600">Responded</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-6 rounded-[24px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-8 text-white">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">Find your next home</p>
              <h2 className="mt-2 text-2xl font-semibold">Ready to discover your next ideal property?</h2>
              <p className="mt-2 text-sm text-white/85">Browse verified listings and connect with trusted landlords in one polished experience.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
              <Link to="/properties" className="btn-secondary">Browse properties</Link>
              <Link to="/tenant/favorites" className="btn-outline border-white bg-white/10 text-white hover:bg-white hover:text-primary">View favorites</Link>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Request support</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Tell landlords what you need</h2>
              <p className="mt-2 text-sm text-slate-500">Send a targeted request by property type and let approved landlords reach out to you.</p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('tenant-request-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary"
            >
              Send request
            </button>
          </div>

          <div id="tenant-request-form" className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Property type</label>
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value)}
                className="input-field w-full"
              >
                <option value="">Select a type</option>
                {propertyTypes.map((type) => (
                  <option key={type} value={type}> {type.charAt(0).toUpperCase() + type.slice(1)} </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">City (optional)</label>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="input-field w-full"
              >
                <option value="">Any city</option>
                {cities.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Min budget (XAF)</label>
              <input
                type="number"
                value={minBudget}
                onChange={(event) => setMinBudget(event.target.value)}
                className="input-field w-full"
                placeholder="0"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Max budget (XAF)</label>
              <input
                type="number"
                value={maxBudget}
                onChange={(event) => setMaxBudget(event.target.value)}
                className="input-field w-full"
                placeholder="Any"
              />
            </div>
            <div className="lg:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Tell landlords what you need</label>
              <textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                rows={4}
                className="input-field w-full min-h-[140px] resize-none"
                placeholder="I need a 2-bedroom apartment with reliable water and parking close to downtown."
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={requestMutation.isLoading}
                  className="btn-primary"
                >
                  {requestMutation.isLoading ? 'Sending...' : 'Send request to landlords'}
                </button>
                <p className="text-sm text-slate-500">Verified landlords will receive your need and can respond directly to you.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default TenantDashboard
