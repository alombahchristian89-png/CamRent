import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  Building,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCog,
  Users
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  AdminTable
} from '../../components/admin/AdminUI'
import { formatCompactNumber, formatDateLabel, formatRelativeTime } from '../../components/admin/adminUtils'
import { formatXaf } from '../../utils/currency'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const resolveImageUrl = (image) => {
  if (typeof image === 'string') return image
  if (image && typeof image === 'object') return image.url || image.secure_url || ''
  return ''
}

const resolveDocumentUrl = (documentValue) => {
  if (typeof documentValue === 'string') return documentValue
  if (documentValue && typeof documentValue === 'object') return documentValue.url || documentValue.path || ''
  return ''
}

const RENTAL_TYPE_ORDER = ['daily', 'weekly', 'monthly', 'yearly']

const SparklineChart = ({ values, startLabel = 'May 1', endLabel = 'May 25' }) => {
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? 100 / (values.length - 1) : 100
  const points = values.map((value, index) => {
    const x = index * step
    const y = 76 - ((value / max) * 52)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="rounded-[24px] bg-slate-50/80 p-4">
      <svg viewBox="0 0 100 80" className="h-44 w-full">
        <defs>
          <linearGradient id="chart-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="chart-area" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.28)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.03)" />
          </linearGradient>
        </defs>
        {[16, 30, 44, 58, 72].map((line) => (
          <line
            key={line}
            x1="0"
            y1={line}
            x2="100"
            y2={line}
            stroke="rgba(148, 163, 184, 0.18)"
            strokeDasharray="2 4"
          />
        ))}
        <polyline fill="url(#chart-area)" stroke="none" points={`0,80 ${points} 100,80`} />
        <polyline
          fill="none"
          stroke="url(#chart-line)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {values.map((value, index) => {
          const x = index * step
          const y = 76 - ((value / max) * 52)
          return <circle key={`${value}-${index}`} cx={x} cy={y} r="1.8" fill="#ffffff" stroke="#2563EB" strokeWidth="1.5" />
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}

const VerificationDonut = ({
  pending,
  approved,
  rejected,
  pendingLabel = 'Pending',
  approvedLabel = 'Approved',
  rejectedLabel = 'Rejected'
}) => {
  const total = Math.max(pending + approved + rejected, 1)
  const pendingDegrees = (pending / total) * 360
  const approvedDegrees = (approved / total) * 360
  const rejectedDegrees = (rejected / total) * 360
  const background = `conic-gradient(#60a5fa 0deg ${pendingDegrees}deg, #4ade80 ${pendingDegrees}deg ${pendingDegrees + approvedDegrees}deg, #fda4af ${pendingDegrees + approvedDegrees}deg ${pendingDegrees + approvedDegrees + rejectedDegrees}deg)`

  return (
    <div className="flex flex-col items-center justify-center gap-4 lg:flex-row">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{ background }}>
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-bold text-slate-950">{pending}</span>
          <span className="text-xs text-slate-400">{pendingLabel}</span>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-blue-400" />
          <span className="text-slate-600">{pendingLabel}</span>
          <span className="font-semibold text-slate-950">{pending}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="text-slate-600">{approvedLabel}</span>
          <span className="font-semibold text-slate-950">{approved}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-rose-300" />
          <span className="text-slate-600">{rejectedLabel}</span>
          <span className="font-semibold text-slate-950">{rejected}</span>
        </div>
      </div>
    </div>
  )
}

const PropertyPerformanceBars = ({ values, weekLabel = 'Week' }) => (
  <div className="space-y-3">
    {values.map((value, index) => (
      <div key={`${value}-${index}`}>
        <div className="mb-1 flex items-center justify-between text-sm text-slate-500">
          <span>{weekLabel} {index + 1}</span>
          <span className="font-semibold text-slate-700">{value}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-700" style={{ width: `${Math.max(20, value)}%` }} />
        </div>
      </div>
    ))}
  </div>
)

const ActivityListItem = ({ icon: Icon, title, subtitle, time, tone = 'violet' }) => (
  <div className="flex items-start gap-3 rounded-[22px] border border-slate-100 bg-slate-50/70 p-3">
    <div className={`admin-icon-shell admin-icon-shell-${tone} h-10 w-10`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="whitespace-nowrap text-xs text-slate-400">{time}</span>
      </div>
    </div>
  </div>
)

const MobilePreviewCard = ({
  title,
  property,
  bedsLabel = 'Beds',
  bathsLabel = 'Baths',
  sqftLabel = 'sqft',
  fallbackTitle = 'Modern Apartment',
  fallbackLocation = 'Yaounde, Cameroon',
  fallbackAlt = 'Property preview'
}) => {
  const imageUrl = resolveImageUrl(property?.images?.[0])

  return (
    <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-3 text-white shadow-[0_35px_80px_-36px_rgba(37,99,235,0.6)]">
      <div className="rounded-[26px] bg-white/12 p-3 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span>{title}</span>
          <Search className="h-3.5 w-3.5" />
        </div>
        <div className="rounded-[22px] bg-white p-3 text-slate-900">
          <div className="mb-3 overflow-hidden rounded-[18px] bg-slate-100">
            {imageUrl ? (
              <img src={imageUrl} alt={property?.title || fallbackAlt} className="h-28 w-full object-cover" />
            ) : (
              <div className="flex h-28 items-center justify-center">
                <Home className="h-7 w-7 text-slate-300" />
              </div>
            )}
          </div>
          <p className="text-sm font-semibold">{property?.title || fallbackTitle}</p>
          <p className="mt-1 text-xs text-slate-500">{property?.location?.city || fallbackLocation}</p>
          <p className="mt-3 text-sm font-semibold text-slate-950">{formatXaf(property?.price)}</p>
          <div className="mt-3 flex gap-2 text-[10px] text-slate-500">
            <span>{property?.bedrooms || 2} {bedsLabel}</span>
            <span>{property?.bathrooms || 2} {bathsLabel}</span>
            <span>{property?.area || 1200} {sqftLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const PropertyPreviewCard = ({
  property,
  labels = {
    statusInactive: 'Inactive',
    statusPendingApproval: 'Pending approval',
    statusRented: 'Rented',
    statusListed: 'Listed',
    price: 'Price',
    landlord: 'Landlord',
    unknown: 'Unknown',
    beds: 'beds',
    baths: 'baths',
    sqft: 'sqft',
    listed: 'Listed',
    fallbackAlt: 'Property image',
    fallbackTitle: 'Untitled property',
    fallbackLocation: 'Unknown location'
  }
}) => {
  const imageUrl = resolveImageUrl(property?.images?.[0])
  const status = !property?.isActive
    ? labels.statusInactive
    : !property?.isApproved
      ? labels.statusPendingApproval
      : property?.listingStatus === 'taken'
        ? labels.statusRented
        : labels.statusListed
  const tone = !property?.isActive ? 'red' : !property?.isApproved ? 'amber' : property?.listingStatus === 'taken' ? 'blue' : 'emerald'

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="h-44 w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={property?.title || labels.fallbackAlt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-44 items-center justify-center text-slate-400">
            <Home className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{property?.title || labels.fallbackTitle}</p>
            <p className="mt-1 text-xs text-slate-500">{property?.location?.city || labels.fallbackLocation}</p>
          </div>
          <AdminStatusBadge tone={tone}>{status}</AdminStatusBadge>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-900">{labels.price}</span>
            <span>{formatXaf(property?.price)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-900">{labels.landlord}</span>
            <span className="truncate text-right">{property?.landlord?.name || property?.landlord || labels.unknown}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <span>{property?.bedrooms || 0} {labels.beds}</span>
            <span>{property?.bathrooms || 0} {labels.baths}</span>
            <span>{property?.area || 0} {labels.sqft}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">{labels.listed} {formatRelativeTime(property?.createdAt)}</p>
      </div>
    </div>
  )
}

const AdminDashboard = () => {
  const [language, setLanguage] = useState('en')

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

  const dashboardQuery = useQuery('adminDashboard', adminAPI.getDashboard, {
    select: (response) => response.data.data
  })

  const notificationsQuery = useQuery(
    ['adminNotifications', { limit: 4 }],
    () => adminAPI.getNotifications({ limit: 4 }),
    {
      select: (response) => response.data.data.notifications || []
    }
  )

  const propertyReportsQuery = useQuery(
    ['adminPropertyReports'],
    () => adminAPI.getPropertyReports(),
    {
      select: (response) => response.data.data,
      staleTime: 30000
    }
  )

  const queryClient = useQueryClient()

  useEffect(() => {
    let ws
    try {
      const configuredWsUrl = import.meta.env.VITE_WS_NOTIFICATIONS_URL
      const hostIsLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const wsUrl = configuredWsUrl || (hostIsLocal ? 'ws://127.0.0.1:5000/ws/notifications' : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/notifications`)
      ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        try { ws.send(JSON.stringify({ role: 'admin' })) } catch (e) {}
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg && msg.type === 'notification') {
            // refresh notifications list
            queryClient.invalidateQueries(['adminNotifications'])
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // ignore ws errors in environments without ws
    }

    return () => {
      try { if (ws) ws.close() } catch (e) {}
    }
  }, [queryClient])

  const inquiriesPreviewQuery = useQuery(
    ['adminInquiriesPreview', { limit: 3 }],
    () => adminAPI.getInquiries({ limit: 3 }),
    {
      select: (response) => response.data.data.inquiries || [],
      staleTime: 15000
    }
  )

  const auditLogsQuery = useQuery(
    ['adminAuditLogs', { limit: 5 }],
    () => adminAPI.getAuditLogs({ limit: 5 }),
    {
      select: (response) => response.data.data.logs || []
    }
  )

  const usersQuery = useQuery(
    ['adminUsersPreview', { limit: 5 }],
    () => adminAPI.getUsers({ limit: 5 }),
    {
      select: (response) => response.data.data.users || []
    }
  )

  const propertiesQuery = useQuery(
    ['adminPropertiesPreview', { limit: 6 }],
    () => adminAPI.getProperties({ limit: 6 }),
    {
      select: (response) => response.data.data.properties || []
    }
  )

  const approvedLandlordsCountQuery = useQuery(
    ['adminApprovedLandlordsCount'],
    () => adminAPI.getLandlords({ status: 'approved', limit: 1 }),
    {
      select: (response) => response.data.data.pagination?.total || 0
    }
  )

  const tenantCountQuery = useQuery(
    ['adminTenantCount'],
    () => adminAPI.getUsers({ role: 'tenant', limit: 1 }),
    {
      select: (response) => response.data.data.pagination?.total || 0
    }
  )

  const suspendedUsersCountQuery = useQuery(
    ['adminSuspendedUsersCount'],
    () => adminAPI.getUsers({ isActive: 'false', limit: 1 }),
    {
      select: (response) => response.data.data.pagination?.total || 0
    }
  )

  const { stats = {}, recentUsers = [], pendingLandlords = [] } = dashboardQuery.data || {}
  const notifications = notificationsQuery.data || []
  const logs = auditLogsQuery.data || []
  const users = usersQuery.data || []
  const properties = propertiesQuery.data || []
  const propertyReports = propertyReportsQuery.data || {}
  const rentalTypeCounts = useMemo(() => {
    return RENTAL_TYPE_ORDER.reduce((acc, type) => {
      const found = (propertyReports.byRentalType || []).find((item) => item.rentalType === type)
      acc[type] = found?.count || 0
      return acc
    }, {})
  }, [propertyReports.byRentalType])

  const categoryRentalRows = useMemo(() => {
    return (propertyReports.byPropertyCategoryAndRentalType || []).map((row) => {
      const byType = RENTAL_TYPE_ORDER.reduce((acc, type) => {
        const found = (row.rentalTypeCounts || []).find((item) => item.rentalType === type)
        acc[type] = found?.count || 0
        return acc
      }, {})

      const total = RENTAL_TYPE_ORDER.reduce((sum, type) => sum + (byType[type] || 0), 0)

      return {
        propertyCategory: row.propertyCategory,
        byType,
        total
      }
    })
  }, [propertyReports.byPropertyCategoryAndRentalType])
  const approvedLandlords = approvedLandlordsCountQuery.data || 0
  const totalTenants = tenantCountQuery.data || 0
  const suspendedUsers = suspendedUsersCountQuery.data || 0
  const rejectedLandlords = Math.max(0, (stats.totalLandlords || 0) - approvedLandlords - (stats.pendingVerifications || 0))
  const heroNotification = notifications[0]
  const featuredPendingLandlord = pendingLandlords[0]
  const t = (key, fallback) => translate(language, key, fallback)

  const analyticsSeries = useMemo(
    () => [
      Math.max(4, stats.totalUsers || 0),
      Math.max(6, totalTenants || 0),
      Math.max(3, stats.totalLandlords || 0),
      Math.max(2, stats.pendingVerifications || 0),
      Math.max(5, approvedLandlords || 0),
      Math.max(3, stats.totalProperties || 0),
      Math.max(2, stats.totalInquiries || 0)
    ],
    [approvedLandlords, stats, totalTenants]
  )

  const activityFeed = [
    ...recentUsers.map((user) => ({
      id: `user-${user._id}`,
      icon: Users,
      title: t('adminDashboardActivityNewRegistration', 'New account registration'),
      subtitle: user.name || user.email,
      time: formatRelativeTime(user.createdAt),
      tone: user.role === 'landlord' ? 'violet' : 'blue'
    })),
    ...notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      icon: Bell,
      title: notification.title,
      subtitle: notification.message,
      time: formatRelativeTime(notification.created_at),
      tone: notification.type?.includes('approved') ? 'emerald' : notification.type?.includes('rejected') ? 'rose' : 'indigo'
    }))
  ].slice(0, 5)

  const estimatedRevenue = Math.max(1800000, (stats.totalProperties || 0) * 140000 + (stats.totalLandlords || 0) * 12000)
  const scheduledViewings = Math.max(6, Math.round((stats.totalInquiries || 0) * 0.35) + 2)
  const rentalTypeHeaderLabels = [
    t('adminRentalTypeDaily', 'Daily'),
    t('adminRentalTypeWeekly', 'Weekly'),
    t('adminRentalTypeMonthly', 'Monthly'),
    t('adminRentalTypeYearly', 'Yearly')
  ]
  const propertyPreviewLabels = {
    statusInactive: t('adminPropertyStatusInactive', 'Inactive'),
    statusPendingApproval: t('adminPropertyStatusPendingApproval', 'Pending approval'),
    statusRented: t('adminPropertyStatusRented', 'Rented'),
    statusListed: t('adminPropertyStatusListed', 'Listed'),
    price: t('adminPropertyPrice', 'Price'),
    landlord: t('adminPropertyLandlord', 'Landlord'),
    unknown: t('adminCommonUnknown', 'Unknown'),
    beds: t('adminPropertyBeds', 'beds'),
    baths: t('adminPropertyBaths', 'baths'),
    sqft: t('adminPropertySqft', 'sqft'),
    listed: t('adminPropertyListedPrefix', 'Listed'),
    fallbackAlt: t('adminPropertyImageAlt', 'Property image'),
    fallbackTitle: t('adminPropertyFallbackTitle', 'Untitled property'),
    fallbackLocation: t('adminPropertyFallbackLocation', 'Unknown location')
  }
  const inquiryStatusLabelMap = {
    pending: t('adminInquiryStatusPending', 'Pending'),
    responded: t('adminInquiryStatusResponded', 'Responded'),
    closed: t('adminInquiryStatusClosed', 'Closed')
  }

  const statCards = [
    {
      icon: Users,
      label: t('adminStatTotalUsersLabel', 'Total users'),
      value: formatCompactNumber(stats.totalUsers),
      helper: t('adminStatTotalUsersHelper', 'Platform accounts across every role'),
      tone: 'blue',
      trend: t('adminStatTotalUsersTrend', '+12.4% this month')
    },
    {
      icon: Building,
      label: t('adminStatVerifiedLandlordsLabel', 'Verified landlords'),
      value: formatCompactNumber(approvedLandlords),
      helper: `${formatCompactNumber(totalTenants)} ${t('adminStatVerifiedLandlordsHelperSuffix', 'tenants onboarded')}`,
      tone: 'violet',
      trend: t('adminStatVerifiedLandlordsTrend', '+4 new approvals')
    },
    {
      icon: ShieldCheck,
      label: t('adminStatPendingVerificationsLabel', 'Pending verifications'),
      value: formatCompactNumber(stats.pendingVerifications),
      helper: t('adminStatPendingVerificationsHelper', 'Need an admin review decision'),
      tone: 'amber',
      trend: t('adminStatPendingVerificationsTrend', '2 urgent reviews')
    },
    {
      icon: CheckCircle2,
      label: t('adminStatApprovedLandlordsLabel', 'Approved landlords'),
      value: formatCompactNumber(approvedLandlords),
      helper: t('adminStatApprovedLandlordsHelper', 'Verified and ready to list'),
      tone: 'emerald',
      trend: t('adminStatApprovedLandlordsTrend', 'Healthy pipeline')
    },
    {
      icon: Home,
      label: t('adminStatActivePropertiesLabel', 'Active properties'),
      value: formatCompactNumber(stats.totalProperties),
      helper: t('adminStatActivePropertiesHelper', 'Live property inventory'),
      tone: 'indigo',
      trend: t('adminStatActivePropertiesTrend', '+3 new listings')
    },
    {
      icon: MessageSquare,
      label: t('adminStatOpenInquiriesLabel', 'Open inquiries'),
      value: formatCompactNumber(stats.totalInquiries),
      helper: `${formatCompactNumber(suspendedUsers)} ${t('adminStatOpenInquiriesHelperSuffix', 'suspended users under review')}`,
      tone: 'rose',
      trend: t('adminStatOpenInquiriesTrend', 'Fast response queue')
    },
    {
      icon: FileCheck2,
      label: t('adminStatMonthlyRevenueLabel', 'Monthly revenue'),
      value: `FCFA ${formatCompactNumber(estimatedRevenue)}`,
      helper: t('adminStatMonthlyRevenueHelper', 'Estimated recurring value this month'),
      tone: 'violet',
      trend: t('adminStatMonthlyRevenueTrend', '+8.2% vs last month')
    },
    {
      icon: CalendarDays,
      label: t('adminStatScheduledViewingsLabel', 'Scheduled viewings'),
      value: scheduledViewings,
      helper: t('adminStatScheduledViewingsHelper', 'Upcoming tours across the platform'),
      tone: 'blue',
      trend: t('adminStatScheduledViewingsTrend', 'Balanced calendar')
    }
  ]

  const previewInquiries = inquiriesPreviewQuery.data || []

  const previewViewings = [
    { label: '2:30 PM', title: 'Riverfront Loft', attendee: 'Nadia S.' },
    { label: '4:00 PM', title: 'Harbor Residence', attendee: 'Frank L.' },
    { label: '6:15 PM', title: 'Luxe Duplex', attendee: 'Mina K.' }
  ]

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <AdminPageShell
      eyebrow={t('adminDashboardEyebrow', 'Dashboard')}
      title={t('adminDashboardTitle', 'Welcome back, Admin! 👋')}
      description={t('adminDashboardDescription', 'Monitor growth, approvals, inquiries, and operations from one polished workspace.')}
      actions={(
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          {formatDateLabel(new Date())}
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="transform scale-90 origin-top-left">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card, index) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.24 }}>
                <AdminStatCard key={card.label} {...card} />
              </motion.div>
            ))}
          </div>
        </div>

        <AdminSectionCard
          title={t('adminRecentPropertyListingsTitle', 'Recent property listings')}
          description={t('adminRecentPropertyListingsDescription', 'View the latest listed properties for faster inquiry follow-up.')}
          action={(
            <Link to="/admin/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
              {t('adminViewAll', 'View all')} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        >
          {properties.length === 0 ? (
            <AdminEmptyState
              icon={Home}
              title={t('adminNoPropertyListingsTitle', 'No property listings')}
              description={t('adminNoPropertyListingsDescription', 'New properties will appear here as landlords publish listings.')}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyPreviewCard key={property._id} property={property} labels={propertyPreviewLabels} />
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminRentalMixAnalyticsTitle', 'Rental mix analytics')}
          description={t('adminRentalMixAnalyticsDescription', 'Live distribution by property category and rental type from indexed reporting columns.')}
        >
          {propertyReportsQuery.isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : propertyReportsQuery.isError ? (
            <AdminEmptyState
              icon={Building}
              title={t('adminPropertyAnalyticsUnavailableTitle', 'Property analytics unavailable')}
              description={t('adminPropertyAnalyticsUnavailableDescription', 'The reporting endpoint could not be loaded right now.')}
            />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('adminAnalyticsActive', 'Active')}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{propertyReports.totals?.active || 0}</p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{t('adminAnalyticsAvailable', 'Available')}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{propertyReports.totals?.available || 0}</p>
                </div>
                <div className="rounded-[20px] border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{t('adminAnalyticsTaken', 'Taken')}</p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">{propertyReports.totals?.taken || 0}</p>
                </div>
              </div>

              <AdminTable headers={[t('adminCategory', 'Category'), ...rentalTypeHeaderLabels, t('adminTotal', 'Total')]}>
                {categoryRentalRows.map((row) => (
                  <tr key={row.propertyCategory} className="admin-table-row">
                    <td className="px-4 py-4 first:pl-0 text-sm font-semibold text-slate-900 capitalize">{row.propertyCategory}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.byType.daily}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.byType.weekly}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.byType.monthly}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.byType.yearly}</td>
                    <td className="px-4 py-4 last:pr-0 text-sm font-semibold text-slate-900">{row.total}</td>
                  </tr>
                ))}
                <tr className="admin-table-row bg-slate-50/70">
                  <td className="px-4 py-4 first:pl-0 text-sm font-semibold text-slate-900">{t('adminAllCategories', 'All categories')}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{rentalTypeCounts.daily || 0}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{rentalTypeCounts.weekly || 0}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{rentalTypeCounts.monthly || 0}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{rentalTypeCounts.yearly || 0}</td>
                  <td className="px-4 py-4 last:pr-0 text-sm font-semibold text-slate-900">{propertyReports.totals?.active || 0}</td>
                </tr>
              </AdminTable>
            </div>
          )}
        </AdminSectionCard>

        <div className="transform scale-90 origin-top-left">
          <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <AdminSectionCard
              title={t('adminPlatformOverviewTitle', 'Platform overview')}
              description={t('adminPlatformOverviewDescription', 'A premium view of growth and marketplace activity.')}
              action={(
                <div className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  {t('adminThisMonth', 'This month')}
                </div>
              )}
            >
              <SparklineChart
                values={analyticsSeries}
                startLabel={t('adminSparklineStartLabel', 'May 1')}
                endLabel={t('adminSparklineEndLabel', 'May 25')}
              />
            </AdminSectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <AdminSectionCard title={t('adminPropertyPerformanceTitle', 'Property performance')} description={t('adminPropertyPerformanceDescription', 'Demand is trending positively across the portfolio.')}>
                <PropertyPerformanceBars values={[72, 84, 76, 92, 88, 95]} weekLabel={t('adminWeek', 'Week')} />
              </AdminSectionCard>

              <AdminSectionCard title={t('adminRecentInquiriesTitle', 'Recent inquiries')} description={t('adminRecentInquiriesDescription', 'A refined snapshot of the latest tenant conversations.')} action={<Link to="/admin/inquiries" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">{t('adminViewAll', 'View all')}</Link>}>
                <div className="space-y-3">
                  {previewInquiries.map((inq) => {
                    const name = inq.tenantId?.name || inq.tenantId?.email || t('adminCommonUnknown', 'Unknown')
                    const propertyTitle = inq.propertyId?.title || inq.propertyId?.name || t('adminCommonProperty', 'Property')
                    const statusLabel = inquiryStatusLabelMap[inq.status] || (inq.status || '').replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
                    const tone = inq.status === 'pending' ? 'amber' : inq.status === 'responded' ? 'blue' : 'emerald'
                    return (
                      <Link key={inq.id} to={`/admin/inquiries?id=${inq.id}`} className="block">
                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3 hover:shadow-sm transition">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{name}</p>
                            <p className="text-xs text-slate-500">{propertyTitle}</p>
                          </div>
                          <div className="text-right">
                            <AdminStatusBadge tone={tone}>{statusLabel}</AdminStatusBadge>
                            <p className="mt-2 text-[11px] text-slate-400">{formatRelativeTime(inq.createdAt)}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </AdminSectionCard>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <AdminSectionCard title={t('adminRecentNotificationsTitle', 'Recent notifications')} description={t('adminRecentNotificationsDescription', 'Live updates from your operations team.')}>
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatRelativeTime(notification.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title={t('adminUpcomingViewingsTitle', 'Upcoming viewings')} description={t('adminUpcomingViewingsDescription', 'Tours scheduled for the next day.')}>
              <div className="space-y-3">
                {previewViewings.map((viewing) => (
                  <div key={viewing.label} className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{viewing.title}</p>
                      <p className="text-xs text-slate-500">{viewing.attendee}</p>
                    </div>
                    <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{viewing.label}</div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            

            <AdminSectionCard title={t('adminPlatformHealthTitle', 'Platform health')} description={t('adminPlatformHealthDescription', 'Service readiness and review load.')}>
              <div className="space-y-4">
                {[
                  { key: 'uptime', label: t('adminMetricUptime', 'Uptime'), value: '99.98%', color: 'bg-emerald-500' },
                  { key: 'responseTime', label: t('adminMetricResponseTime', 'Response time'), value: '182ms', color: 'bg-sky-500' },
                  { key: 'verificationQueue', label: t('adminMetricVerificationQueue', 'Verification queue'), value: t('adminMetricVerificationQueueValue', '12 open'), color: 'bg-blue-500' }
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{metric.label}</span>
                      <span className="font-semibold text-slate-900">{metric.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${metric.color}`} style={{ width: metric.key === 'verificationQueue' ? '60%' : metric.key === 'responseTime' ? '82%' : '98%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,1.05fr)_minmax(0,1.15fr)]">
          <AdminSectionCard
            title={t('adminUserManagementTitle', 'User management')}
            description={t('adminUserManagementDescription', 'A quick look at the latest accounts and access states.')}
            action={<Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">{t('adminOpenUsers', 'Open users')} <ArrowRight className="h-4 w-4" /></Link>}
          >
            {users.length === 0 ? (
              <AdminEmptyState
                icon={UserCog}
                title={t('adminNoUsersFoundTitle', 'No users found')}
                description={t('adminNoUsersFoundDescription', 'Users will appear here as new tenants and landlords create accounts.')}
              />
            ) : (
              <AdminTable headers={[t('adminUser', 'User'), t('adminRole', 'Role'), t('adminStatus', 'Status'), t('adminJoined', 'Joined'), t('adminActions', 'Actions')]}>
                {users.map((user) => (
                  <tr key={user._id} className="admin-table-row">
                    <td className="px-4 py-4 first:pl-0">
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AdminStatusBadge tone={user.role === 'admin' ? 'red' : user.role === 'landlord' ? 'blue' : 'emerald'}>
                        {user.role}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <AdminStatusBadge tone={user.isActive ? 'emerald' : 'red'}>
                        {user.isActive ? t('adminStatusActive', 'Active') : t('adminStatusSuspended', 'Suspended')}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{formatDateLabel(user.createdAt)}</td>
                    <td className="px-4 py-4 last:pr-0">
                      <Link to="/admin/users" className="text-sm font-semibold text-blue-600">{t('adminManage', 'Manage')}</Link>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title={t('adminLandlordVerificationTitle', 'Landlord verification')}
            description={t('adminLandlordVerificationDescription', 'Review the next landlord waiting for approval.')}
            action={<Link to="/admin/landlords" className="text-sm font-semibold text-blue-600">{t('adminReviewQueue', 'Review queue')}</Link>}
          >
            {featuredPendingLandlord ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{featuredPendingLandlord.name}</p>
                    <p className="text-sm text-slate-500">
                      {t('adminSubmittedOn', 'Submitted on')} {formatDateLabel(featuredPendingLandlord.createdAt)}
                    </p>
                  </div>
                  <AdminStatusBadge tone="amber">{t('adminPending', 'Pending')}</AdminStatusBadge>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {(featuredPendingLandlord.documents || []).slice(0, 3).map((documentValue, index) => {
                    const documentUrl = resolveDocumentUrl(documentValue)
                    return (
                      <a
                        key={`${documentUrl || 'doc'}-${index}`}
                        href={documentUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-3 transition hover:border-blue-200 hover:bg-white"
                      >
                        <div className="flex h-24 items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white text-slate-300">
                          <FileCheck2 className="h-7 w-7" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{t('adminDocument', 'Document')} {index + 1}</p>
                        <p className="text-xs text-slate-500">{documentUrl ? t('adminViewDocument', 'View document') : t('adminLegacyUploadLink', 'Legacy upload link')}</p>
                      </a>
                    )
                  })}
                  {(featuredPendingLandlord.documents || []).length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500 sm:col-span-3">
                      {t('adminNoDocumentsAttached', 'No documents are attached to this verification request yet.')}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t('adminNotes', 'Admin notes')}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {t('adminReviewIdentityDocs', 'Review identity proof, ownership proof, and selfie before approving this landlord account.')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/admin/landlords" className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                    {t('adminReject', 'Reject')}
                  </Link>
                  <Link to="/admin/landlords" className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
                    {t('adminRequestMoreInfo', 'Request more info')}
                  </Link>
                  <Link to="/admin/landlords" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">
                    {t('adminApprove', 'Approve')}
                  </Link>
                </div>
              </div>
            ) : (
              <AdminEmptyState
                icon={ShieldCheck}
                title={t('adminVerificationQueueClearTitle', 'Verification queue is clear')}
                description={t('adminVerificationQueueClearDescription', 'There are no pending landlord applications waiting for review right now.')}
              />
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title={t('adminAuditLogsTitle', 'Audit logs')}
            description={t('adminAuditLogsDescription', 'Trace important admin actions and moderation events.')}
            action={<Link to="/admin/audit-logs" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">{t('adminSeeLogs', 'See logs')} <ArrowRight className="h-4 w-4" /></Link>}
          >
            {logs.length === 0 ? (
              <AdminEmptyState
                icon={Clock3}
                title={t('adminNoAuditRecordsTitle', 'No audit records yet')}
                description={t('adminNoAuditRecordsDescription', 'Approval decisions, role updates, and other sensitive actions will be listed here.')}
              />
            ) : (
              <AdminTable headers={[t('adminAdmin', 'Admin'), t('adminAction', 'Action'), t('adminTarget', 'Target'), t('adminDetails', 'Details'), t('adminTime', 'Time')]}>
                {logs.map((log) => (
                  <tr key={log.id} className="admin-table-row">
                    <td className="px-4 py-4 first:pl-0 text-sm font-medium text-slate-900">{log.admin?.name || t('adminSystem', 'System')}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 capitalize">{String(log.actionType || '').replaceAll('_', ' ')}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{log.targetUser?.name || log.targetUser?.email || '—'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {log.details?.message || log.details?.reason || `${String(log.entityType || t('adminRecord', 'record')).replaceAll('_', ' ')} ${t('adminUpdated', 'updated')}`}
                    </td>
                    <td className="px-4 py-4 last:pr-0 text-sm text-slate-500">{formatRelativeTime(log.createdAt)}</td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminSectionCard>
        </div>
      </div>
    </div>
    </AdminPageShell>
  )
}

export default AdminDashboard
