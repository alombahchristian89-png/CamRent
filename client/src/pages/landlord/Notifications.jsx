import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Bell, Calendar, CheckCircle2, MessageSquare, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import { notificationAPI } from '../../services/api'

const LandlordNotifications = () => {
  const [page, setPage] = useState(1)
  const [activeResponse, setActiveResponse] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    ['landlordNotifications', { page }],
    () => notificationAPI.getMyNotifications({ page }),
    {
      select: (response) => response.data.data
    }
  )

  const markAsReadMutation = useMutation(
    (id) => notificationAPI.markAsRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('landlordNotifications')
        queryClient.invalidateQueries('userNotifications')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to mark notification as read')
      }
    }
  )

  const markAllAsReadMutation = useMutation(
    () => notificationAPI.markAllAsRead(),
    {
      onSuccess: () => {
        toast.success('All notifications marked as read')
        queryClient.invalidateQueries('landlordNotifications')
        queryClient.invalidateQueries('userNotifications')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update notifications')
      }
    }
  )

  const respondMutation = useMutation(
    ({ notificationId, response }) => notificationAPI.respondToPropertyRequest({ notificationId, response }),
    {
      onSuccess: () => {
        toast.success('Response sent to tenant')
        setActiveResponse(null)
        setResponseMessage('')
        queryClient.invalidateQueries('landlordNotifications')
        queryClient.invalidateQueries('userNotifications')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send response')
      }
    }
  )

  const handleMarkAsRead = (id, isRead) => {
    if (isRead || markAsReadMutation.isLoading) return
    markAsReadMutation.mutate(id)
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0
  const pagination = data?.pagination

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Landlord Notifications</h1>
            <p className="mt-2 text-sm text-slate-600">Requests and alerts from tenants and your property network.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {unreadCount} unread
            </span>
            <button
              type="button"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllAsReadMutation.isLoading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto h-11 w-11 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No notifications yet</h2>
            <p className="mt-1 text-sm text-slate-500">Tenant requests and messages will appear here when they are delivered.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isRead = notification.is_read === true
              const metadata = notification.metadata || {}
              const isTenantRequest = metadata.event === 'tenant_property_request'

              return (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 ${isRead ? 'border-slate-200 bg-slate-50/60' : 'border-emerald-200 bg-emerald-50/50'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                      {isTenantRequest && (
                        <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
                          <p><span className="font-semibold">Property type:</span> {metadata.propertyType || 'Any'}</p>
                          {metadata.city && <p><span className="font-semibold">City:</span> {metadata.city}</p>}
                          {metadata.bedrooms != null && <p><span className="font-semibold">Bedrooms:</span> {metadata.bedrooms}</p>}
                          {metadata.minBudget != null && <p><span className="font-semibold">Min budget:</span> {metadata.minBudget}</p>}
                          {metadata.maxBudget != null && <p><span className="font-semibold">Max budget:</span> {metadata.maxBudget}</p>}
                          <p className="mt-2"><span className="font-semibold">Tenant message:</span> {metadata.tenantMessage || 'No additional details'}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isRead && (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" aria-label="Unread" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notification.id, isRead)}
                        disabled={isRead || markAsReadMutation.isLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isRead ? 'Read' : 'Mark read'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                    {isTenantRequest && activeResponse === notification.id && (
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <MessageSquare className="h-4 w-4" />
                          Respond to tenant request
                        </div>
                        <textarea
                          value={responseMessage}
                          onChange={(event) => setResponseMessage(event.target.value)}
                          rows={4}
                          className="input-field w-full resize-none"
                          placeholder="Write a short response to the tenant request"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respondMutation.mutate({ notificationId: notification.id, response: responseMessage.trim() })}
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
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {isTenantRequest && activeResponse !== notification.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveResponse(notification.id)
                          setResponseMessage('')
                        }}
                        className="self-start rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Reply to request
                      </button>
                    )}
                    {!isTenantRequest && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generic notification
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LandlordNotifications
