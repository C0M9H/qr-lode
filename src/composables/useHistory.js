import { ref, computed } from 'vue'

const STORAGE_KEY = 'qr-history'
const MAX_ITEMS = 200

const history = ref([])

// Load from storage
const loadHistory = () => {
  try {
    history.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    history.value = []
  }
}

const saveHistory = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  } catch {
    // Storage full
  }
}

loadHistory()

export function useHistory() {
  const addEntry = (data, format = 'QR_CODE') => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      data,
      type: detectType(data),
      format: format, // Store the barcode format (QR_CODE, CODE_128, EAN_13, etc.)
      timestamp: new Date().toISOString(),
      favorite: false
    }
    // Avoid exact duplicate in last 10 items
    const recent = history.value.slice(0, 10)
    if (recent.some(e => e.data === data)) return null

    history.value.unshift(entry)
    if (history.value.length > MAX_ITEMS) {
      history.value = history.value.slice(0, MAX_ITEMS)
    }
    saveHistory()
    return entry
  }

  const removeEntry = (id) => {
    history.value = history.value.filter(e => e.id !== id)
    saveHistory()
  }

  const clearHistory = () => {
    history.value = []
    saveHistory()
  }

  const toggleFavorite = (id) => {
    const entry = history.value.find(e => e.id === id)
    if (entry) {
      entry.favorite = !entry.favorite
      saveHistory()
    }
  }

  const favorites = computed(() => history.value.filter(e => e.favorite))
  const count = computed(() => history.value.length)

  return {
    history,
    favorites,
    count,
    addEntry,
    removeEntry,
    clearHistory,
    toggleFavorite
  }
}

function detectType(data) {
  if (!data) return 'text'
  if (/^https?:\/\//i.test(data)) return 'url'
  if (/^mailto:/i.test(data)) return 'email'
  if (/^tel:/i.test(data)) return 'phone'
  if (/^smsto?:/i.test(data)) return 'sms'
  if (/^wifi:/i.test(data)) return 'wifi'
  if (/^BEGIN:VCARD/i.test(data)) return 'contact'
  if (/^BEGIN:VEVENT/i.test(data)) return 'event'
  if (/^geo:/i.test(data)) return 'location'
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data)) return 'email'
  return 'text'
}
