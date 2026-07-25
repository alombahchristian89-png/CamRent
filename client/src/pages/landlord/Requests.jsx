import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Inbox, Calendar, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import { notificationAPI } from '../../services/api'

const LandlordRequests = () => {
  const [page, setPage] = useState(1)
  const [activeResponse, setActiveResponse] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [responseStatus, setResponseStatus] = useState('confirmed')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    ['landlordRequests', page],
    () => notificationAPI.getMyNotifications({ page, limit: 10 }),
    {
      select: (response) => response.data.data
    }
  )

  const respondMutation = useMutation(
    ({ notificationId, response }) => notificationAPI.respondToPropertyRequest({ notificationId, response }),
    {
      onSuccess: () => {
        toast.success('Response sent to tenant')
        setActiveResponse(null)
        setResponseMessage('')
        queryClient.invalidateQueries('landlordRequests')
        queryClient.invalidateQueries('userNotifications')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Unable to send response')
      }
    }
  )

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0
  const pagination = data?.pagination
  const requestNotifications = notifications.filter((notification) => {
    const metadata = notification.metadata || {}
    return metadata.event === 'tenant_accommodation_booking_request' || metadata.event === 'tenant_accommodation_search_request' || metadata.event === 'tenant_property_request'
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
            <h1 className="text-2xl font-bold text-slate-900">Request Inbox</h1>
            <p className="mt-2 text-sm text-slate-600">View booking requests for hotels and guest houses, then send status updates to guests.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            <Inbox className="h-4 w-4" />
            {unreadCount} unread items
          </div>
        </div>
      </div>

      {requestNotifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No booking requests yet</h2>
          <p className="mt-2 text-sm text-slate-500">Guests will appear here when they request rooms from your accommodation listings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requestNotifications.map((notification) => {
            const metadata = notification.metadata || {}
            const isRequest = metadata.event === 'tenant_property_request' || metadata.event === 'tenant_accommodation_search_request' || metadata.event === 'tenant_accommodation_booking_request'

            return (
              <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Inbox className="h-4 w-4 text-slate-500" />
                      {notification.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                    {isRequest && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                          <p><span className="font-semibold">Tenant:</span> {metadata.tenantName || 'Unknown'}</p>
                          <p><span className="font-semibold">Email:</span> {metadata.tenantEmail || 'Unknown'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                          <p><span className="font-semibold">Accommodation:</span> {metadata.propertyType || metadata.accommodationType || 'Any'}</p>
                          <p><span className="font-semibold">Room type:</span> {metadata.roomType || 'Any'}</p>
                          <p><span className="font-semibold">City:</span> {metadata.city || 'Any'}</p>
                          {(metadata.checkInDate || metadata.checkOutDate) && (
                            <p><span className="font-semibold">Dates:</span> {metadata.checkInDate || '--'} to {metadata.checkOutDate || '--'}</p>
                          )}
                          {metadata.guests != null && <p><span className="font-semibold">Guests:</span> {metadata.guests}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    {notification.is_read ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                        New
                      </span>
                    )}
                  </div>
                </div>

                {isRequest && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Reply to this request</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveResponse(notification.id)
                          setResponseStatus('confirmed')
                        }}
                        className="text-primary text-sm font-medium"
                      >
                        Respond
                      </button>
                    </div>
                    {activeResponse === notification.id && (
                      <div className="mt-4 space-y-3">
                        {metadata.event === 'tenant_accommodation_booking_request' && (
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Booking status</label>
                            <select
                              value={responseStatus}
                              onChange={(event) => setResponseStatus(event.target.value)}
                              className="input-field w-full"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="pending">Pending</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        )}
                        <textarea
                          value={responseMessage}
                          onChange={(event) => setResponseMessage(event.target.value)}
                          rows={4}
                          className="input-field w-full resize-none"
                          placeholder="Write a message to the tenant explaining availability and next steps"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respondMutation.mutate({ notificationId: notification.id, response: responseMessage.trim(), bookingStatus: responseStatus })}
                            disabled={!responseMessage.trim() || respondMutation.isLoading}
                            className="btn-primary"
                          >
                            {respondMutation.isLoading ? 'Sending...' : 'Send response'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveResponse(null)
                              setResponseMessage('')
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

export default LandlordRequests
