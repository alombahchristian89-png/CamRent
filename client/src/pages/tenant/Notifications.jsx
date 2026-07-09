import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Bell, Calendar, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import { notificationAPI } from '../../services/api'

const TenantNotifications = () => {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    ['tenantNotifications', { page }],
    () => notificationAPI.getMyNotifications({ page }),
    {
      select: (response) => response.data.data
    }
  )

  const markAsReadMutation = useMutation(
    (id) => notificationAPI.markAsRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenantNotifications')
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
        queryClient.invalidateQueries('tenantNotifications')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update notifications')
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
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="mt-2 text-sm text-slate-600">Track listing updates from properties you follow.</p>
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
            <p className="mt-1 text-sm text-slate-500">When a favorite listing changes, updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isRead = notification.is_read === true
              return (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 ${
                    isRead ? 'border-slate-200 bg-slate-50/60' : 'border-emerald-200 bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
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

export default TenantNotifications
