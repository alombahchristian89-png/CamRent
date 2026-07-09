import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  AlertCircle,
  Archive,
  Building,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  MessageSquare,
  Reply,
  Search,
  Star,
  Ticket,
  User,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inquiryAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'

const LandlordInquiries = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [selectedInquiryId, setSelectedInquiryId] = useState(null)
  const queryClient = useQueryClient()
  const { isVerifiedLandlord } = useAuth()

  const { data: inquiriesData, isLoading } = useQuery(
    ['landlordInquiries', { page, search: searchQuery, status: filterStatus, dateRange }],
    () => inquiryAPI.getLandlordInquiries({ page, search: searchQuery, status: filterStatus, dateRange }),
    {
      select: (response) => response.data.data
    }
  )

  const markReadMutation = useMutation((inquiryId) => inquiryAPI.markInquiryAsRead(inquiryId), {
    onSuccess: () => {
      queryClient.invalidateQueries('landlordInquiries')
    }
  })

  const respondMutation = useMutation(
    ({ id, message }) => inquiryAPI.sendInquiryMessage(id, { message }),
    {
      onSuccess: () => {
        toast.success('Message sent successfully!')
        queryClient.invalidateQueries('landlordInquiries')
        setRespondingTo(null)
        setResponseMessage('')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send response')
      }
    }
  )

  const closeInquiryMutation = useMutation(inquiryAPI.closeInquiry, {
    onSuccess: () => {
      toast.success('Inquiry closed')
      queryClient.invalidateQueries('landlordInquiries')
    },
    onError: () => {
      toast.error('Failed to close inquiry')
    }
  })

  const { inquiries = [], pagination } = inquiriesData || {}

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry._id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  )

  const getLastMessageEntry = (inquiry) => {
    const messages = Array.isArray(inquiry?.messages) ? inquiry.messages : []
    return messages[messages.length - 1] || null
  }

  const isInquiryUnread = (inquiry) => {
    const lastMessage = getLastMessageEntry(inquiry)
    if (!lastMessage || lastMessage.senderRole !== 'tenant') return false

    const lastMessageTime = new Date(lastMessage.createdAt || 0).getTime()
    const lastReadTime = new Date(inquiry?.readState?.landlordLastReadAt || 0).getTime()
    return lastMessageTime > lastReadTime
  }

  const unreadCount = inquiries.reduce(
    (count, inquiry) => count + (isInquiryUnread(inquiry) ? 1 : 0),
    0
  )

  const getPriority = (inquiry) => {
    const createdAt = new Date(inquiry?.createdAt || 0).getTime()
    const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
    if (inquiry?.status === 'pending' && ageDays >= 3) return 'high'
    if (inquiry?.status === 'pending') return 'medium'
    return 'low'
  }

  const getPriorityClasses = (priority) => {
    if (priority === 'high') return 'bg-rose-100 text-rose-700'
    if (priority === 'medium') return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  const formatLastActivity = (inquiry) => {
    const lastMessage = getLastMessageEntry(inquiry)
    const value = new Date(lastMessage?.createdAt || inquiry?.updatedAt || inquiry?.createdAt || 0)
    if (Number.isNaN(value.getTime())) return 'No activity'

    return value.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCloseInquiry = (inquiryId) => {
    if (!markReadMutation.isLoading) {
      markReadMutation.mutate(inquiryId)
    }

    if (window.confirm('Are you sure you want to close this inquiry?')) {
      closeInquiryMutation.mutate(inquiryId)
    }
  }

  const handleRespond = (inquiryId) => {
    if (!responseMessage.trim()) {
      toast.error('Please enter a response message')
      return
    }

    if (!markReadMutation.isLoading) {
      markReadMutation.mutate(inquiryId)
    }

    respondMutation.mutate({ id: inquiryId, message: responseMessage })
  }

  const showScheduleViewing = () => {
    toast('Scheduling workflow will be added in the next backend release.')
  }

  const showArchivePlaceholder = () => {
    toast('Archive action is queued for backend support.')
  }

  if (!isVerifiedLandlord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h2>
          <p className="text-gray-600 mb-6">You need to complete verification before you can view inquiries.</p>
          <a href="/landlord/verification" className="btn-primary">Complete Verification</a>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="workspace-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Landlord Ops</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Tenant Inquiry Inbox</h1>
              <p className="mt-2 text-sm text-slate-600">Run each inquiry as a structured ticket and keep communication on-platform.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700">
              <Ticket className="h-4 w-4 text-slate-500" />
              {inquiries.length} active ticket{inquiries.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{unreadCount}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{inquiries.filter((inquiry) => inquiry.status === 'pending').length}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Closed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-700">{inquiries.filter((inquiry) => inquiry.status === 'closed').length}</p>
            </div>
          </div>
        </section>

        <section className="workspace-panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tenant, property, or message"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setPage(1)
                }}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value)
                    setPage(1)
                  }}
                  className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">All inquiries</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(event) => {
                    setDateRange(event.target.value)
                    setPage(1)
                  }}
                  className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {inquiries.length === 0 ? (
          <section className="workspace-panel p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-14 w-14 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No inquiries found</h2>
            <p className="text-slate-600">No records match your current filters.</p>
          </section>
        ) : (
          <section className="workspace-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                    <th className="px-4 py-3 text-left font-semibold">Property</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold">Last activity</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {inquiries.map((inquiry) => {
                    const unread = isInquiryUnread(inquiry)
                    const priority = getPriority(inquiry)

                    return (
                      <tr key={inquiry._id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3.5 align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{inquiry.tenantId?.name || 'Tenant'}</p>
                            <p className="text-xs text-slate-500">{inquiry.tenantContact?.email || inquiry.tenantId?.email || 'No email'}</p>
                            {unread && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                <AlertCircle className="h-3 w-3" />
                                New
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-medium text-slate-900">{inquiry.propertyId?.title || 'Property'}</p>
                          <p className="mt-1 text-xs text-slate-500">{inquiry.propertyId?.location?.city || 'Unknown city'}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            inquiry.status === 'responded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : inquiry.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {inquiry.status === 'responded' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                            {inquiry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getPriorityClasses(priority)}`}>
                            <Star className="h-3.5 w-3.5" />
                            {priority}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top text-xs text-slate-600">{formatLastActivity(inquiry)}</td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedInquiryId(inquiry._id)
                                if (unread && !markReadMutation.isLoading) {
                                  markReadMutation.mutate(inquiry._id)
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </button>
                            {inquiry.status !== 'closed' && (
                              <button
                                onClick={() => {
                                  setRespondingTo(inquiry._id)
                                  setSelectedInquiryId(inquiry._id)
                                  if (unread && !markReadMutation.isLoading) {
                                    markReadMutation.mutate(inquiry._id)
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                              >
                                <Reply className="h-3.5 w-3.5" />
                                Reply
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedInquiry && (
          <section className="workspace-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedInquiry.propertyId?.title || 'Inquiry details'}</h2>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  {selectedInquiry.tenantId?.name || 'Unknown tenant'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={showScheduleViewing}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Viewing
                </button>
                <button
                  onClick={showArchivePlaceholder}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
                {selectedInquiry.status !== 'closed' && (
                  <button
                    onClick={() => handleCloseInquiry(selectedInquiry._id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 transition hover:bg-rose-100"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(selectedInquiry.messages || []).map((messageEntry, index) => {
                const isLandlordMessage = messageEntry.senderRole === 'landlord'
                const senderName = isLandlordMessage ? 'You' : (selectedInquiry.tenantId?.name || 'Tenant')

                return (
                  <article
                    key={`${messageEntry.createdAt || index}-${index}`}
                    className={`rounded-2xl border p-3.5 ${
                      isLandlordMessage ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="mb-1 text-xs text-slate-600">{senderName} • {new Date(messageEntry.createdAt).toLocaleString()}</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{messageEntry.message}</p>
                  </article>
                )
              })}
            </div>

            {respondingTo === selectedInquiry._id && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Reply in conversation</h4>
                <textarea
                  value={responseMessage}
                  onChange={(event) => setResponseMessage(event.target.value)}
                  placeholder="Type your response here..."
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  rows={4}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRespond(selectedInquiry._id)}
                    disabled={respondMutation.isLoading}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {respondMutation.isLoading ? <LoadingSpinner size="sm" /> : <Reply className="h-4 w-4" />}
                    Send Response
                  </button>
                  <button
                    onClick={() => {
                      setRespondingTo(null)
                      setResponseMessage('')
                    }}
                    className="inline-flex items-center rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {pagination && pagination.pages > 1 && (
          <section className="workspace-panel p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={pagination.page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <button
                  onClick={() => setPage((currentPage) => Math.min(pagination.pages, currentPage + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default LandlordInquiries
