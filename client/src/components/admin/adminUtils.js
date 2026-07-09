export const formatCompactNumber = (value) => new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(Number(value || 0))

export const formatDateLabel = (value, options = {}) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  })
}

export const formatDateTimeLabel = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const formatRelativeTime = (value) => {
  if (!value) return 'just now'

  const diff = Date.now() - new Date(value).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute))
    return `${minutes} min${minutes > 1 ? 's' : ''} ago`
  }

  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour))
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  const days = Math.max(1, Math.round(diff / day))
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export const getInitials = (name = '') => {
  const cleaned = String(name).trim()
  if (!cleaned) return 'U'

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}
