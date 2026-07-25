import { useState } from 'react'
import { useQuery } from 'react-query'
import { Inbox, Calendar, CheckCircle2 } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import { notificationAPI } from '../../services/api'

const TenantRequests = () => {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery(
    ['tenantRequests', page],
    () => notificationAPI.getMyNotifications({ page, limit: 10 }),
    {
      select: (response) => response.data.data
    }
  )

  const notifications = data?.notifications || []
  const pagination = data?.pagination
  const formatStayWindow = (checkInDate, checkInTime, checkOutDate, checkOutTime) => {
    const start = checkInDate ? `${checkInDate}${checkInTime ? ` ${checkInTime}` : ''}` : null
    const end = checkOutDate ? `${checkOutDate}${checkOutTime ? ` ${checkOutTime}` : ''}` : null

    if (start && end) return `${start} to ${end}`
    if (start) return start
    if (end) return end
    return null
  }
  const requestResponses = notifications.filter((notification) => {
    const metadata = notification.metadata || {}
    return metadata.event === 'tenant_accommodation_request_response' || metadata.event === 'tenant_accommodation_booking_status'
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Booking & request history</h1>
            <p className="mt-2 text-sm text-slate-600">Review provider responses for your hotels and guest-house accommodation requests.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            <Inbox className="h-4 w-4" />
            {requestResponses.length} responses
          </div>
        </div>
      </div>

      {requestResponses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No booking responses yet</h2>
          <p className="mt-2 text-sm text-slate-500">Submit a booking request from an accommodation listing to see provider updates here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requestResponses.map((notification) => {
            const metadata = notification.metadata || {}
            return (
              <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Inbox className="h-4 w-4 text-slate-500" />
                      {notification.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        <p><span className="font-semibold">Landlord:</span> {metadata.landlordName || 'Unknown'}</p>
                        <p><span className="font-semibold">Email:</span> {metadata.landlordEmail || 'Unknown'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        <p><span className="font-semibold">Accommodation:</span> {metadata.propertyType || metadata.accommodationType || 'Any'}</p>
                        <p><span className="font-semibold">Room type:</span> {metadata.roomType || 'Any'}</p>
                        <p><span className="font-semibold">City:</span> {metadata.city || 'Any'}</p>
                        {formatStayWindow(metadata.checkInDate, metadata.checkInTime, metadata.checkOutDate, metadata.checkOutTime) && (
                          <p><span className="font-semibold">Dates:</span> {formatStayWindow(metadata.checkInDate, metadata.checkInTime, metadata.checkOutDate, metadata.checkOutTime)}</p>
                        )}
                        {metadata.bookingStatus && <p><span className="font-semibold">Status:</span> {metadata.bookingStatus}</p>}
                        {metadata.minBudget != null && <p><span className="font-semibold">Min budget:</span> {metadata.minBudget}</p>}
                        {metadata.maxBudget != null && <p><span className="font-semibold">Max budget:</span> {metadata.maxBudget}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Response
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Landlord message</p>
                  <p className="mt-2 whitespace-pre-line">{metadata.response || notification.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
            disabled={page >= pagination.pages}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TenantRequests
