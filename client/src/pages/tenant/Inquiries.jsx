import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  ArrowRight,
  Filter,
  Send,
  MessageSquare,
  MapPin,
  User,
  Home,
  CheckCircle,
  Clock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
  Ticket
} from 'lucide-react'
import { inquiryAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Inquiries = () => {
  const [selectedInquiryId, setSelectedInquiryId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)
  const messagesEndRef = useRef(null)
  const queryClient = useQueryClient()

  // Fetch all inquiries
  const { data: inquiriesData, isLoading } = useQuery(
    ['tenantInquiries', { page, search: searchQuery, status: filterStatus, dateRange }],
    () => inquiryAPI.getTenantInquiries({ page, search: searchQuery, status: filterStatus, dateRange }),
    {
      select: (response) => response.data.data
    }
  )

  const inquiries = inquiriesData?.inquiries || []
  const pagination = inquiriesData?.pagination

  const markReadMutation = useMutation(
    (inquiryId) => inquiryAPI.markInquiryAsRead(inquiryId),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('tenantInquiries')
      }
    }
  )

  const getLastMessageEntry = (inquiry) => {
    const messages = Array.isArray(inquiry?.messages) ? inquiry.messages : []
    return messages[messages.length - 1] || null
  }

  const isInquiryUnread = (inquiry) => {
    const lastMessage = getLastMessageEntry(inquiry)
    if (!lastMessage || lastMessage.senderRole !== 'landlord') return false
    const lastMessageTime = new Date(lastMessage.createdAt || 0).getTime()
    const lastReadTime = new Date(inquiry?.readState?.tenantLastReadAt || 0).getTime()
    return lastMessageTime > lastReadTime
  }

  const unreadCount = inquiries.reduce(
    (count, inquiry) => count + (isInquiryUnread(inquiry) ? 1 : 0),
    0
  )

  const markInquiryAsRead = (inquiry) => {
    if (!inquiry?._id || !isInquiryUnread(inquiry) || markReadMutation.isLoading) return
    markReadMutation.mutate(inquiry._id)
  }

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry._id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  )

  useEffect(() => {
    if (!selectedInquiryId && inquiries.length > 0) {
      setSelectedInquiryId(inquiries[0]._id)
    }
  }, [inquiries, selectedInquiryId])

  useEffect(() => {
    if (selectedInquiry?._id) {
      markInquiryAsRead(selectedInquiry)
    }
  }, [selectedInquiry?._id])

  // Send message mutation
  const sendMessageMutation = useMutation(
    ({ inquiryId, message }) => inquiryAPI.sendInquiryMessage(inquiryId, { message }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenantInquiries')
        setNewMessage('')
        toast.success('Update sent to landlord')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send message')
      }
    }
  )

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedInquiry?.messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedInquiry) return

    setIsSending(true)
    try {
      await sendMessageMutation.mutateAsync({
        inquiryId: selectedInquiry._id,
        message: newMessage.trim()
      })
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatLastActivity = (date) => {
    const value = new Date(date)
    if (Number.isNaN(value.getTime())) return 'No activity yet'
    return value.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'responded':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    if (status === 'responded') return 'In progress'
    if (status === 'closed') return 'Closed'
    return 'Open'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'responded':
        return <CheckCircle className="h-3 w-3" />
      case 'closed':
        return <X className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
    setPage(1)
  }

  const handleStatusChange = (event) => {
    setFilterStatus(event.target.value)
    setPage(1)
  }

  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value)
    setPage(1)
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
        <div className="workspace-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant Workspace</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Inquiry Tickets</h1>
              <p className="mt-2 text-sm text-slate-600">Track every property conversation as an auditable support ticket.</p>
            </div>
            <Link to="/properties" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
              Browse properties
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Open Tickets</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{inquiries.length}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unread Replies</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{unreadCount}</p>
            </div>
            <div className="workspace-kpi">
              <p className="text-xs uppercase tracking-wide text-slate-500">Response Mode</p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <Sparkles className="h-4 w-4" />
                In-platform only
              </p>
            </div>
          </div>
        </div>

        <div className="workspace-panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by property, location, or message"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Filter className="h-4 w-4 text-slate-400" />
                <select value={filterStatus} onChange={handleStatusChange} className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <select value={dateRange} onChange={handleDateRangeChange} className="bg-transparent pr-6 text-sm text-slate-700 focus:outline-none">
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <section className="workspace-panel xl:col-span-2">
            <header className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Ticket Queue</h2>
            </header>

            {inquiries.length === 0 ? (
              <div className="p-8 text-center">
                <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="text-sm font-medium text-slate-800">No inquiry tickets found</p>
                <p className="mt-2 text-sm text-slate-500">Adjust your filters or start a new inquiry from property listings.</p>
              </div>
            ) : (
              <div className="max-h-[640px] divide-y divide-slate-200 overflow-y-auto">
                {inquiries.map((inquiry) => {
                  const lastMessage = getLastMessageEntry(inquiry)
                  const unread = isInquiryUnread(inquiry)

                  return (
                    <button
                      key={inquiry._id}
                      onClick={() => {
                        setSelectedInquiryId(inquiry._id)
                        markInquiryAsRead(inquiry)
                      }}
                      className={`w-full px-4 py-4 text-left transition ${
                        selectedInquiryId === inquiry._id ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{inquiry.propertyId?.title || 'Property inquiry'}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {inquiry.propertyId?.location?.city || 'Unknown city'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusColor(inquiry.status)}`}>
                          {getStatusIcon(inquiry.status)}
                          {getStatusLabel(inquiry.status)}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-xs text-slate-600">
                        {lastMessage?.message || inquiry.message || 'No message body'}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{formatLastActivity(lastMessage?.createdAt || inquiry.updatedAt || inquiry.createdAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          {unread && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                          {unread ? 'Unread' : 'Read'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="workspace-panel xl:col-span-3">
            {selectedInquiry ? (
              <>
                <header className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ticket Details</p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-900">{selectedInquiry.propertyId?.title || 'Property inquiry'}</h2>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {selectedInquiry.propertyId?.location?.city || 'Unknown location'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${getStatusColor(selectedInquiry.status)}`}>
                        {getStatusIcon(selectedInquiry.status)}
                        {getStatusLabel(selectedInquiry.status)}
                      </span>
                      <span className="rounded-full border border-slate-200 px-2.5 py-1">Created {formatDate(selectedInquiry.createdAt)}</span>
                    </div>
                  </div>
                </header>

                <div className="max-h-[430px] space-y-3 overflow-y-auto p-4 sm:p-5">
                  {(selectedInquiry.messages || []).map((messageEntry, index) => {
                    const isTenantMessage = messageEntry.senderRole === 'tenant'
                    const senderName = isTenantMessage ? 'You' : (selectedInquiry.landlordId?.name || 'Landlord')

                    return (
                      <article
                        key={`${messageEntry.createdAt || index}-${index}`}
                        className={`rounded-2xl border p-3.5 sm:p-4 ${
                          isTenantMessage
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-emerald-200 bg-emerald-50/60'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <User className="h-3.5 w-3.5" />
                            {senderName}
                          </span>
                          <span>•</span>
                          <span>{formatDate(messageEntry.createdAt)} at {formatTime(messageEntry.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{messageEntry.message}</p>
                      </article>
                    )
                  })}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-slate-200 p-4 sm:p-5">
                  {selectedInquiry.status === 'closed' ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      This ticket is closed. You can open a new inquiry from the property page if needed.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reply</label>
                      <div className="flex items-end gap-2">
                        <textarea
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          placeholder="Write your update. Press Enter to send, Shift+Enter for a new line."
                          className="min-h-[88px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
                          disabled={isSending}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSending}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                          aria-label="Send reply"
                        >
                          {isSending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3.5 w-3.5" />
                        Landlord notifications are also sent by email when they are offline.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-[500px] items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">Select a ticket</h3>
                  <p className="mt-1 text-sm text-slate-600">Choose an inquiry from the queue to view details and respond.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="workspace-panel p-4">
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
          </div>
        )}
      </div>
    </div>
  )
}

export default Inquiries
