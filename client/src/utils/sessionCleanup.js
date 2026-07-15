const PRESERVED_LOCAL_KEYS = new Set(['camrent-theme-mode', 'camrent-language'])

export const clearClientSessionData = ({ hardClear = false } = {}) => {
  if (typeof window === 'undefined') return

  const preservedEntries = []
  if (!hardClear) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !PRESERVED_LOCAL_KEYS.has(key)) continue
      preservedEntries.push([key, window.localStorage.getItem(key)])
    }
  }

  window.localStorage.clear()

  if (!hardClear) {
    preservedEntries.forEach(([key, value]) => {
      if (value !== null) {
        window.localStorage.setItem(key, value)
      }
    })
  }

  window.sessionStorage.clear()
  
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
  
  // Clear all sensitive user data from various storage mechanisms
  clearClientSessionData({ hardClear: true })
  
  // Clear ALL forms on the page
  const allForms = document.querySelectorAll('form')
  allForms.forEach((form) => {
    form.reset()
    // Also manually clear all inputs
    const inputs = form.querySelectorAll('input, textarea, select')
    inputs.forEach((input) => {
      input.value = ''
      input.checked = false
    })
  })
  
  // Clear input field values site-wide
  const allInputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"], input[type="tel"]')
  allInputs.forEach((input) => {
    input.value = ''
    input.autocomplete = 'off'
  })
  
  // Clear any form data that might be in memory
  const allTextAreas = document.querySelectorAll('textarea')
  allTextAreas.forEach((textarea) => {
    textarea.value = ''
  })
  
  // Clear IndexedDB if used (wait for completion)
  if (typeof indexedDB !== 'undefined') {
    try {
      const databases = await indexedDB.databases()
      for (const db of databases) {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name)
          request.onsuccess = resolve
          request.onerror = reject
        })
      }
    } catch (e) {
      // Silently fail if IndexedDB is not available
    }
  }
  
  // Clear any cached data from window object
  Object.keys(window).forEach((key) => {
    if (key.toLowerCase().includes('cache') || key.toLowerCase().includes('data') || key.toLowerCase().includes('form')) {
      try {
        delete window[key]
      } catch (e) {
        // Some properties cannot be deleted, ignore
      }
    }
  })
  
  // Clear browser's "remember me" data
  if (typeof document !== 'undefined') {
    // Disable browser autofill
    const inputs = document.querySelectorAll('input')
    inputs.forEach((input) => {
      input.setAttribute('autocomplete', 'off')
    })
  }
}