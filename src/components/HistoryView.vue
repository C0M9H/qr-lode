<template>
  <div class="history-view">
    <!-- Header -->
    <div class="history-header">
      <div class="header-info">
        <h2>Istoric</h2>
        <span class="count-badge">{{ count }} scanări</span>
      </div>
      <div class="header-actions">
        <button
          v-if="history.length > 0"
          @click="confirmClear"
          class="btn-clear"
          title="Șterge tot istoricul"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M6 4V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M14 4l-1 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="filter-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="filter-tab"
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="search-icon">
        <circle cx="7" cy="7" r="5" stroke="var(--text3)" stroke-width="1.5"/>
        <path d="M11 11l3 3" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input
        v-model="search"
        type="search"
        placeholder="Caută în istoric..."
        class="search-input"
      />
      <button v-if="search" @click="search = ''" class="search-clear">✕</button>
    </div>

    <!-- Empty state -->
    <div v-if="filteredHistory.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" stroke="var(--border)" stroke-width="2"/>
          <path d="M28 20v10M28 34v2" stroke="var(--text3)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <p v-if="search">Niciun rezultat pentru "<strong>{{ search }}</strong>"</p>
      <p v-else-if="activeTab === 'favorites'">Nu ai niciun cod favorit.</p>
      <p v-else>Nicio scanare încă. Scanează un cod QR!</p>
    </div>

    <!-- History list -->
    <div v-else class="history-list" ref="listEl">
      <transition-group name="list" tag="div">
        <div
          v-for="entry in filteredHistory"
          :key="entry.id"
          class="history-item"
          @click="expandEntry(entry)"
        >
          <div class="item-icon" :class="entry.type">
            <span>{{ typeEmoji(entry.type) }}</span>
          </div>

          <div class="item-body">
            <p class="item-data">{{ truncate(entry.data, 60) }}</p>
            <div class="item-meta">
              <span class="item-type">{{ typeName(entry.type) }}</span>
              <span class="item-time">{{ formatTime(entry.timestamp) }}</span>
            </div>
          </div>

          <div class="item-actions">
            <button
              @click.stop="toggleFavorite(entry.id)"
              class="fav-btn"
              :class="{ active: entry.favorite }"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2l1.8 5.4H17l-4.8 3.5 1.8 5.4L9 13.4l-4.8 3.5 1.8-5.4L1 8.4h6.2L9 2z"
                  :fill="entry.favorite ? 'var(--warn)' : 'none'"
                  :stroke="entry.favorite ? 'var(--warn)' : 'var(--text3)'"
                  stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Entry detail modal -->
    <transition name="modal">
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
        <div class="modal-panel">
          <div class="modal-header">
            <div class="modal-type-badge" :class="selected.type">
              {{ typeEmoji(selected.type) }} {{ typeName(selected.type) }}
            </div>
            <button @click="selected = null" class="modal-close">✕</button>
          </div>

          <div class="modal-body">
            <p class="modal-data">{{ selected.data }}</p>
            <p class="modal-time">{{ formatFullTime(selected.timestamp) }}</p>
          </div>

          <div class="modal-actions">
            <button
              v-if="selected.type === 'url'"
              @click="openUrl(selected.data)"
              class="modal-btn primary"
            >Deschide link</button>

            <button @click="copyEntry(selected.data)" class="modal-btn secondary">
              {{ copiedId === selected.id ? '✓ Copiat' : 'Copiază' }}
            </button>

            <button @click="shareEntry(selected.data)" class="modal-btn secondary">
              Trimite
            </button>

            <button @click="deleteEntry(selected.id)" class="modal-btn danger">
              Șterge
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Confirm clear dialog -->
    <transition name="modal">
      <div v-if="showClearConfirm" class="modal-backdrop" @click.self="showClearConfirm = false">
        <div class="modal-panel confirm-panel">
          <h3>Ștergi tot istoricul?</h3>
          <p>Această acțiune nu poate fi anulată.</p>
          <div class="confirm-actions">
            <button @click="showClearConfirm = false" class="modal-btn secondary">Anulează</button>
            <button @click="doClear" class="modal-btn danger">Șterge tot</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHistory } from '../composables/useHistory'

const { history, count, favorites, removeEntry, clearHistory, toggleFavorite } = useHistory()

const search = ref('')
const activeTab = ref('all')
const selected = ref(null)
const copiedId = ref(null)
const showClearConfirm = ref(false)
const listEl = ref(null)

const tabs = computed(() => [
  { id: 'all', label: 'Toate', count: count.value },
  { id: 'favorites', label: '★ Favorite', count: favorites.value.length },
])

const filteredHistory = computed(() => {
  let list = activeTab.value === 'favorites' ? favorites.value : history.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(e => e.data.toLowerCase().includes(q))
  }
  return list
})

const expandEntry = (entry) => {
  selected.value = entry
}

const copyEntry = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = selected.value?.id
    setTimeout(() => { copiedId.value = null }, 2000)
  } catch { }
}

const shareEntry = async (text) => {
  if (navigator.share) {
    try { await navigator.share({ text }) } catch { }
  } else {
    copyEntry(text)
  }
}

const openUrl = (url) => {
  window.open(url, '_blank', 'noopener')
}

const deleteEntry = (id) => {
  removeEntry(id)
  selected.value = null
}

const confirmClear = () => {
  showClearConfirm.value = true
}

const doClear = () => {
  clearHistory()
  showClearConfirm.value = false
}

const truncate = (str, n) => str.length > n ? str.slice(0, n) + '…' : str

const typeEmoji = (type) => {
  const map = {
    url: '🔗', email: '📧', phone: '📞', sms: '💬',
    wifi: '📶', contact: '👤', event: '📅', location: '📍', text: '📝'
  }
  return map[type] || '📝'
}

const typeName = (type) => {
  const map = {
    url: 'URL', email: 'Email', phone: 'Telefon', sms: 'SMS',
    wifi: 'WiFi', contact: 'Contact', event: 'Eveniment', location: 'Locație', text: 'Text'
  }
  return map[type] || 'Text'
}

const formatTime = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Acum'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

const formatFullTime = (iso) => {
  return new Date(iso).toLocaleString('ro-RO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.history-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

/* Header */
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-header h2 {
  font-family: var(--mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.count-badge {
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  font-family: var(--mono);
}

.btn-clear {
  background: none;
  border: 1px solid var(--border);
  color: var(--text2);
  border-radius: 8px;
  padding: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* Filter tabs */
.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--sans);
}

.filter-tab.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}

.tab-count {
  background: var(--surface);
  font-size: 10px;
  font-family: var(--mono);
  padding: 1px 5px;
  border-radius: 8px;
}

.filter-tab.active .tab-count {
  background: var(--accent);
  color: var(--bg);
}

/* Search */
.search-bar {
  position: relative;
  margin: 0 16px 12px;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 36px;
  color: var(--text);
  font-size: 14px;
  font-family: var(--sans);
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-input::placeholder {
  color: var(--text3);
}

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 8px;
  opacity: 0.6;
}

.empty-state p {
  font-size: 14px;
  color: var(--text2);
  line-height: 1.6;
}

.empty-state strong {
  color: var(--text);
}

/* History list */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  animation: fade-in 0.2s ease;
}

.history-item:active {
  background: var(--surface);
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--surface);
  flex-shrink: 0;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-data {
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--mono);
  margin-bottom: 3px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-type {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.item-time {
  font-size: 11px;
  color: var(--text3);
}

.item-actions {
  flex-shrink: 0;
}

.fav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.modal-panel {
  width: 100%;
  max-width: 480px;
  background: var(--bg2);
  border-radius: 20px 20px 16px 16px;
  padding: 20px;
  border: 1px solid var(--border);
  animation: slide-up 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-type-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  background: var(--accent-dim);
  color: var(--accent);
}

.modal-close {
  background: var(--surface);
  border: none;
  color: var(--text2);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-data {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--text);
  word-break: break-all;
  line-height: 1.6;
  margin-bottom: 8px;
}

.modal-time {
  font-size: 12px;
  color: var(--text3);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-btn {
  flex: 1;
  min-width: calc(50% - 4px);
  padding: 11px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--sans);
  transition: opacity 0.15s;
}

.modal-btn.primary {
  background: var(--accent);
  color: var(--bg);
}

.modal-btn.secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.modal-btn.danger {
  background: rgba(255, 77, 109, 0.15);
  color: var(--danger);
  border: 1px solid rgba(255, 77, 109, 0.3);
}

/* Confirm */
.confirm-panel {
  text-align: center;
  padding: 28px 20px 20px;
}

.confirm-panel h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text);
}

.confirm-panel p {
  font-size: 13px;
  color: var(--text2);
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

/* List transitions */
.list-enter-active, .list-leave-active {
  transition: all 0.25s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Modal transition */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-active .modal-panel, .modal-leave-active .modal-panel {
  transition: transform 0.25s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel {
  transform: translateY(40px);
}

.modal-leave-to .modal-panel {
  transform: translateY(40px);
}
</style>
