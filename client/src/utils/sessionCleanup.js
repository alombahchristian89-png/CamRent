const PRESERVED_LOCAL_KEYS = new Set(['camrent-theme-mode', 'camrent-language'])
const SENSITIVE_LOCAL_KEYS = new Set(['accessToken', 'refreshToken', 'user', 'loginEmail', 'lastEmail', 'registerEmail', 'resetToken'])
const SENSITIVE_SESSION_KEYS = new Set(['loginEmail', 'lastEmail', 'registerEmail', 'resetToken'])

const removeSensitiveKeys = (storage, sensitiveKeys) => {
  if (typeof storage === 'undefined' || !storage?.length) return

  const keysToRemove = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || PRESERVED_LOCAL_KEYS.has(key)) continue

    const normalizedKey = key.toLowerCase()
    const isSensitiveKey = sensitiveKeys.has(key) || normalizedKey.includes('token') || normalizedKey.includes('auth') || normalizedKey.includes('session') || normalizedKey.includes('user')

    if (isSensitiveKey) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => {
    storage.removeItem(key)
  })
}

export const clearClientSessionData = ({ hardClear = false } = {}) => {
  if (typeof window === 'undefined') return

  if (hardClear) {
    removeSensitiveKeys(window.localStorage, SENSITIVE_LOCAL_KEYS)
    removeSensitiveKeys(window.sessionStorage, SENSITIVE_SESSION_KEYS)
  } else {
    removeSensitiveKeys(window.sessionStorage, SENSITIVE_SESSION_KEYS)
  }

  // Clear sensitive data from memory
  if (hardClear) {
    // Remove auth-related cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((c) => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })
    }
  }
}

export const clearSensitiveData = async () => {
  if (typeof window === 'undefined') return

  clearClientSessionData({ hardClear: true })
}