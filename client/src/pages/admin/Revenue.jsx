import { useEffect, useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Home,
  Building,
  User
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatXaf } from '../../utils/currency'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge
} from '../../components/admin/AdminUI'

const AdminRevenue = () => {
  const [language, setLanguage] = useState('en')
  const [dateRange, setDateRange] = useState('month')

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

  const { data: dashboardData, isLoading } = useQuery(
    ['adminDashboard'],
    () => adminAPI.getDashboardStats(),
    { select: (response) => response.data.data }
  )

  const { data: propertiesData } = useQuery(
    ['adminProperties', 1],
    () => adminAPI.getProperties({ page: 1, limit: 100 }),
    { select: (response) => response.data.data }
  )

  const { stats = {} } = dashboardData || {}
  const properties = propertiesData?.properties || []

  const estimatedRevenue = useMemo(() => {
    return properties.reduce((sum, prop) => sum + (prop.price || 0), 0)
  }, [properties])

  const platformCommissionRate = 0.15 // 15% commission
  const platformRevenue = Math.round(estimatedRevenue * platformCommissionRate)

  const revenueByProperty = useMemo(() => {
    return properties
      .filter((prop) => prop.price && prop.price > 0)
      .map((prop) => ({
        id: prop._id,
        title: prop.title || 'Untitled',
        landlord: prop.landlord?.name || 'Unknown',
        price: prop.price || 0,
        commission: Math.round((prop.price || 0) * platformCommissionRate)
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 10)
  }, [properties])

  const totalPlatformRevenue = platformRevenue
  const averagePropertyValue = properties.length > 0
    ? Math.round(revenueByProperty.reduce((sum, p) => sum + p.price, 0) / revenueByProperty.length)
    : 0

  const statCards = [
    {
      label: t('adminRevenueMonthly', 'Total rental value'),
      value: `FCFA ${formatXaf(estimatedRevenue)}`,
      helper: t('adminRevenueMonthlyHelper', 'Combined rental prices of all properties'),
      tone: 'violet'
    },
    {
      label: t('adminRevenueAverage', 'Platform commission (15%)'),
      value: `FCFA ${formatXaf(platformRevenue)}`,
      helper: t('adminRevenueAverageHelper', 'Estimated platform revenue from properties'),
      tone: 'emerald'
    },
    {
      label: t('adminRevenueProperties', 'Active properties'),
      value: properties.length,
      helper: t('adminRevenuePropertiesHelper', 'Contributing to platform revenue'),
      tone: 'blue'
    },
    {
      label: t('adminRevenueLandlords', 'Active landlords'),
      value: stats.totalLandlords || 0,
      helper: t('adminRevenueLandlordsHelper', 'With verified listings'),
      tone: 'indigo'
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <AdminPageShell
      eyebrow={t('adminNavigation', 'Admin')}
      title={t('adminRevenueTitle', 'Revenue Analytics')}
      description={t('adminRevenueDescription', 'Monitor platform revenue and property performance metrics')}
    >
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="admin-surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]">{card.value}</p>
                {card.helper ? <p className="mt-2 text-xs text-slate-500">{card.helper}</p> : null}
              </div>
              <div className={`admin-icon-shell admin-icon-shell-${card.tone}`}>
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Revenue Properties */}
      <AdminSectionCard
        title={t('adminRevenueTopProperties', 'Top revenue properties')}
        description={t('adminRevenueTopPropertiesHelper', 'Properties with highest rental prices')}
      >
        {revenueByProperty.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('adminRevenueNoProperties', 'No properties available')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">{t('adminCommonProperty', 'Property')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">{t('adminCommonLandlord', 'Landlord')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">{t('adminCommonPrice', 'Price')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">{t('adminRevenueEstimated', 'Est. Revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {revenueByProperty.map((prop) => (
                  <tr key={prop.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900 font-medium truncate">{prop.title}</td>
                    <td className="py-3 px-4 text-slate-600 truncate">{prop.landlord}</td>
                    <td className="py-3 px-4 text-right text-slate-900">FCFA {formatXaf(prop.price)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">FCFA {formatXaf(prop.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      {/* Revenue Breakdown */}
      <AdminSectionCard
        title={t('adminRevenueBreakdown', 'Revenue breakdown')}
        description={t('adminRevenueBreakdownHelper', 'Platform revenue sources and distribution')}
      >
        <div className="space-y-4">
          {properties.length === 0 ? (
            <p className="text-slate-500">{t('adminRevenueNoData', 'No active properties available')}</p>
          ) : (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                  <span className="text-sm font-medium text-slate-700">{t('adminRevenueTotalListings', 'Total rental values')}</span>
                </div>
                <span className="text-lg font-bold text-slate-900">FCFA {formatXaf(estimatedRevenue)}</span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-slate-700">{t('adminRevenueCommission', 'Platform commission (15%)')}</span>
                </div>
                <span className="text-lg font-bold text-slate-900">FCFA {formatXaf(platformRevenue)}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{t('adminRevenueTotal', 'Total')}</span>
                <span className="text-xl font-bold text-violet-600">FCFA {formatXaf(platformRevenue)}</span>
              </div>
            </>
          )}
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  )
}

export default AdminRevenue
