<template>
  <div class="app-shell">
    <!-- Header -->
    <header class="app-header">
      <div class="header-logo">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="var(--accent)" stroke-width="1.5"/>
          <rect x="14" y="1" width="7" height="7" rx="1.5" stroke="var(--accent)" stroke-width="1.5"/>
          <rect x="1" y="14" width="7" height="7" rx="1.5" stroke="var(--accent)" stroke-width="1.5"/>
          <rect x="3" y="3" width="3" height="3" fill="var(--accent)"/>
          <rect x="16" y="3" width="3" height="3" fill="var(--accent)"/>
          <rect x="3" y="16" width="3" height="3" fill="var(--accent)"/>
          <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2zM14 18h2v2h-2z" fill="var(--accent)"/>
        </svg>
        <span class="header-title">QR<span class="accent">Scan</span></span>
      </div>
      <div class="header-status">
        <span v-if="isOnline" class="status-dot online"></span>
        <span v-else class="status-dot offline"></span>
        <span class="status-label">{{ isOnline ? 'Online' : 'Offline' }}</span>
      </div>
    </header>

    <!-- Main content -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="view" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Bottom Navigation -->
    <nav class="app-nav">
      <router-link to="/scan" class="nav-item" active-class="active">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 7V4a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M17 2h3a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M22 17v3a2 2 0 0 1-2 2h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <span>Scanează</span>
      </router-link>

      <router-link to="/history" class="nav-item" active-class="active">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M3.05 11a9 9 0 1 0 .5-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M3 4v4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-if="historyCount > 0" class="badge">{{ historyCount > 99 ? '99+' : historyCount }}</span>
        </div>
        <span>Istoric</span>
      </router-link>
    </nav>

    <!-- PWA Install prompt -->
    <transition name="slide-up">
      <div v-if="showInstallPrompt" class="install-banner">
        <div class="install-info">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2v10M10 12l-3-3M10 12l3-3" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M4 14v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Instalează app-ul pe telefon</span>
        </div>
        <div class="install-actions">
          <button @click="installApp" class="btn-install">Instalează</button>
          <button @click="dismissInstall" class="btn-dismiss">✕</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isOnline = ref(navigator.onLine)
const showInstallPrompt = ref(false)
let deferredPrompt = null

const historyCount = computed(() => {
  try {
    const h = JSON.parse(localStorage.getItem('qr-history') || '[]')
    return h.length
  } catch {
    return 0
  }
})

const handleOnline = () => { isOnline.value = true }
const handleOffline = () => { isOnline.value = false }

const handleBeforeInstall = (e) => {
  e.preventDefault()
  deferredPrompt = e
  showInstallPrompt.value = true
}

const installApp = async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    showInstallPrompt.value = false
  }
  deferredPrompt = null
}

const dismissInstall = () => {
  showInstallPrompt.value = false
  deferredPrompt = null
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('beforeinstallprompt', handleBeforeInstall)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
})
</script>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

/* Header */
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-family: var(--mono);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}

.header-title .accent {
  color: var(--accent);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow);
  animation: blink 2s ease-in-out infinite;
}

.status-dot.offline {
  background: var(--danger);
}

.status-label {
  font-size: 11px;
  color: var(--text2);
  font-family: var(--mono);
}

/* Main */
.app-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Nav */
.app-nav {
  flex-shrink: 0;
  display: flex;
  background: var(--bg2);
  border-top: 1px solid var(--border);
  padding-bottom: var(--safe-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 8px;
  text-decoration: none;
  color: var(--text3);
  font-size: 11px;
  font-weight: 500;
  transition: color 0.2s;
  position: relative;
}

.nav-item.active {
  color: var(--accent);
}

.nav-icon {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: -5px;
  right: -8px;
  background: var(--accent);
  color: var(--bg);
  font-size: 9px;
  font-weight: 700;
  font-family: var(--mono);
  padding: 1px 4px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  line-height: 1.4;
}

/* Install Banner */
.install-banner {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--safe-bottom) + 12px);
  left: 16px;
  right: 16px;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 4px 24px rgba(0, 229, 160, 0.15);
  z-index: 100;
}

.install-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text);
}

.install-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-install {
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--sans);
}

.btn-dismiss {
  background: transparent;
  color: var(--text2);
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

/* Transitions */
.view-enter-active,
.view-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.view-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-up-enter-active {
  animation: slide-up 0.3s ease;
}

.slide-up-leave-active {
  animation: slide-up 0.3s ease reverse;
}
</style>
