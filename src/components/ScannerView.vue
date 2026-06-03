<template>
  <div class="scanner-view">
    <!-- Camera viewport -->
    <div class="camera-container">
      <!-- Video element -->
      <video
        ref="videoRef"
        class="camera-video"
        :class="{ mirrored: facingMode === 'user' }"
        playsinline
        muted
        autoplay
      ></video>
      <!-- Hidden canvas for QR detection -->
      <canvas ref="canvasRef" class="scan-canvas"></canvas>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="overlay loading-overlay">
        <div class="spinner"></div>
        <p>Inițializare cameră...</p>
      </div>

      <!-- Error overlay -->
      <div v-else-if="error && !isScanning" class="overlay error-overlay">
        <div class="error-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="var(--danger)" stroke-width="2"/>
            <path d="M20 12v10M20 26v2" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="error-text">{{ error }}</p>
        <button @click="startScanner" class="btn-retry">
          Încearcă din nou
        </button>
      </div>

      <!-- Idle overlay (not started) -->
      <div v-else-if="!isScanning && !isLoading" class="overlay idle-overlay">
        <div class="idle-content">
          <div class="idle-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="4" y="4" width="20" height="20" rx="3" stroke="var(--accent)" stroke-width="2.5"/>
              <rect x="40" y="4" width="20" height="20" rx="3" stroke="var(--accent)" stroke-width="2.5"/>
              <rect x="4" y="40" width="20" height="20" rx="3" stroke="var(--accent)" stroke-width="2.5"/>
              <rect x="9" y="9" width="10" height="10" fill="var(--accent)" rx="1"/>
              <rect x="45" y="9" width="10" height="10" fill="var(--accent)" rx="1"/>
              <rect x="9" y="45" width="10" height="10" fill="var(--accent)" rx="1"/>
              <path d="M40 40h6v6h-6zM46 46h6v6h-6zM52 40h6v6h-6zM46 52h6v6h-6zM40 52h6v6h-6z" fill="var(--accent)"/>
            </svg>
          </div>
          <h2>Scanner QR</h2>
          <p>Apasă pentru a activa camera și scana coduri QR</p>
          <button @click="startScanner" class="btn-start">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5a2 2 0 0 1 2-2h2M14 3h2a2 2 0 0 1 2 2v2M18 14v2a2 2 0 0 1-2 2h-2M6 18H4a2 2 0 0 1-2-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Activează Camera
          </button>
        </div>
      </div>

      <!-- Scanning overlay (active) -->
      <template v-if="isScanning">
        <!-- Corner markers -->
        <div class="scan-frame">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
          <div class="scan-line"></div>
        </div>

        <!-- Scanning hint -->
        <div class="scan-hint">
          <span>{{ scanHint }}</span>
        </div>
      </template>

      <!-- Result flash -->
      <transition name="result-flash">
        <div v-if="resultFlash" class="result-flash"></div>
      </transition>

      <!-- Camera controls -->
      <div v-if="isScanning" class="camera-controls">
        <button @click="toggleFlash" class="ctrl-btn" :class="{ active: flashOn }" title="Flash">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M13 2L4 13h7l-2 7 9-11h-7l2-7z" :stroke="flashOn ? 'var(--accent)' : 'white'" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </button>

        <button @click="handleImageUpload" class="ctrl-btn" title="Din galerie">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="4" width="18" height="14" rx="2" stroke="white" stroke-width="1.8"/>
            <circle cx="7.5" cy="9" r="2" stroke="white" stroke-width="1.5"/>
            <path d="M2 16l5-5 3 3 4-4 6 6" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </button>

        <button @click="toggleCamera" class="ctrl-btn" title="Schimbă camera">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M1 4v6h6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 18v-6h-6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.4 9A8 8 0 0 0 5.8 5.8L1 10M21 12l-4.8 4.2A8 8 0 0 1 3.6 13" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="onFileSelected"
    />

    <!-- Result panel -->
    <transition name="slide-up">
      <div v-if="lastResult" class="result-panel">
        <div class="result-header">
          <div class="result-type-badge" :class="lastResult.type">
            <span>{{ typeLabel(lastResult.type) }}</span>
          </div>
          <button @click="lastResult = null" class="result-close">✕</button>
        </div>

        <div class="result-data">
          <p class="result-text">{{ lastResult.data }}</p>
        </div>

        <div class="result-actions">
          <button
            v-if="lastResult.type === 'url'"
            @click="openUrl(lastResult.data)"
            class="action-btn primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3M10 1h5v5M7 9l8-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Deschide link
          </button>

          <button @click="copyToClipboard(lastResult.data)" class="action-btn secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ copied ? 'Copiat!' : 'Copiază' }}
          </button>

          <button @click="shareResult(lastResult.data)" class="action-btn secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="12" cy="3" r="2" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M6 7l4-2.5M6 9l4 2.5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Trimite
          </button>
        </div>
      </div>
    </transition>

    <!-- Scan counter -->
    <div v-if="isScanning" class="scan-counter">
      <span class="counter-label">Scanat</span>
      <span class="counter-value">{{ scanCount }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useQRScanner } from '../composables/useQRScanner'
import { useHistory } from '../composables/useHistory'

const {
  videoRef, canvasRef, isScanning, isLoading, error,
  flashOn, facingMode,
  startScanner: initScanner, stopScanner, toggleCamera, toggleFlash,
  scanImage
} = useQRScanner()

const { addEntry } = useHistory()

const lastResult = ref(null)
const resultFlash = ref(false)
const copied = ref(false)
const scanCount = ref(0)
const fileInput = ref(null)
let scanInterval = null

const scanHints = [
  'Îndreaptă camera spre codul QR',
  'Ține dispozitivul stabil',
  'Asigură iluminare bună',
  'Apropie-te de cod dacă e mic',
]
const hintIndex = ref(0)
const scanHint = computed(() => scanHints[hintIndex.value])

const startScanner = async () => {
  await initScanner()
  if (isScanning.value) {
    startScanLoop()
    // Rotate hints
    setInterval(() => {
      hintIndex.value = (hintIndex.value + 1) % scanHints.length
    }, 3000)
  }
}

const startScanLoop = () => {
  if (scanInterval) clearInterval(scanInterval)
  // Use requestAnimationFrame-based loop via the composable
  const loop = async () => {
    if (!isScanning.value) return
    try {
      const { videoRef: vr, canvasRef: cr } = { videoRef, canvasRef }
      const video = vr.value
      const canvas = cr.value
      if (!video || !canvas || video.readyState < 2) {
        scanInterval = setTimeout(loop, 150)
        return
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const jsQR = (await import('jsqr')).default
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      })

      if (code && code.data) {
        onCodeDetected(code.data)
        scanInterval = setTimeout(loop, 2000) // Pause after detection
        return
      }
    } catch (e) {
      // continue
    }
    scanInterval = setTimeout(loop, 100)
  }
  scanInterval = setTimeout(loop, 200)
}

const onCodeDetected = (data) => {
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate([50, 30, 50])

  // Flash
  resultFlash.value = true
  setTimeout(() => { resultFlash.value = false }, 400)

  const entry = addEntry(data)
  if (entry) {
    lastResult.value = entry
    scanCount.value++
  }
}

const openUrl = (url) => {
  window.open(url, '_blank', 'noopener')
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

const shareResult = async (text) => {
  if (navigator.share) {
    try {
      await navigator.share({ text })
    } catch { }
  } else {
    copyToClipboard(text)
  }
}

const handleImageUpload = () => {
  fileInput.value?.click()
}

const onFileSelected = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const result = await scanImage(file)
    if (result) {
      onCodeDetected(result)
    } else {
      alert('Nu s-a găsit niciun cod QR în imagine.')
    }
  } catch (err) {
    alert('Eroare la procesarea imaginii.')
  }
  e.target.value = ''
}

const typeLabel = (type) => {
  const labels = {
    url: '🔗 URL',
    email: '📧 Email',
    phone: '📞 Telefon',
    sms: '💬 SMS',
    wifi: '📶 WiFi',
    contact: '👤 Contact',
    event: '📅 Eveniment',
    location: '📍 Locație',
    text: '📝 Text',
  }
  return labels[type] || '📝 Text'
}

onMounted(() => {
  // Auto-start scanner
  startScanner()
})

onUnmounted(() => {
  if (scanInterval) clearTimeout(scanInterval)
  stopScanner()
})
</script>

<style scoped>
.scanner-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  overflow: hidden;
  position: relative;
}

/* Camera */
.camera-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
  min-height: 0;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-video.mirrored {
  transform: scaleX(-1);
}

.scan-canvas {
  display: none;
}

/* Overlays */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 5;
  padding: 32px;
}

.loading-overlay {
  background: rgba(15, 15, 20, 0.9);
  color: var(--text2);
  font-size: 14px;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-overlay {
  background: rgba(15, 15, 20, 0.95);
  text-align: center;
}

.error-text {
  color: var(--text2);
  font-size: 14px;
  max-width: 280px;
  text-align: center;
  line-height: 1.6;
}

.btn-retry {
  margin-top: 8px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--sans);
}

.idle-overlay {
  background: rgba(15, 15, 20, 0.92);
}

.idle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.idle-icon {
  margin-bottom: 8px;
  opacity: 0.9;
}

.idle-content h2 {
  font-family: var(--mono);
  font-size: 22px;
  color: var(--text);
}

.idle-content p {
  font-size: 14px;
  color: var(--text2);
  max-width: 260px;
  line-height: 1.6;
}

.btn-start {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--sans);
  letter-spacing: -0.3px;
}

/* Scan frame */
.scan-frame {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  pointer-events: none;
}

.scan-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 260px 260px at 50% 44%,
    transparent 0%,
    transparent 46%,
    rgba(0,0,0,0.55) 47%
  );
}

.corner {
  position: absolute;
  width: 52px;
  height: 52px;
}

.corner::before, .corner::after {
  content: '';
  position: absolute;
  background: var(--accent);
  border-radius: 3px;
}

.corner::before { width: 100%; height: 4px; }
.corner::after { width: 4px; height: 100%; }

.top-left { top: calc(50% - 120px); left: calc(50% - 120px); }
.top-right { top: calc(50% - 120px); right: calc(50% - 120px); transform: rotate(90deg); }
.bottom-left { bottom: calc(50% - 120px); left: calc(50% - 120px); transform: rotate(-90deg); }
.bottom-right { bottom: calc(50% - 120px); right: calc(50% - 120px); transform: rotate(180deg); }

.scan-line {
  position: absolute;
  left: calc(50% - 116px);
  width: 232px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  box-shadow: 0 0 8px var(--accent), 0 0 20px var(--accent-glow);
  animation: scan-line 2.4s ease-in-out infinite;
  border-radius: 1px;
}

/* Hints */
.scan-hint {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 6px 16px;
  z-index: 4;
}

.scan-hint span {
  font-size: 12px;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
}

/* Camera controls */
.camera-controls {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 6;
}

.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent);
}

/* Flash */
.result-flash {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0.5;
  z-index: 10;
  pointer-events: none;
}

.result-flash-enter-active { animation: flash-in 0.1s ease; }
.result-flash-leave-active { animation: flash-in 0.3s ease reverse; }

@keyframes flash-in {
  from { opacity: 0; }
  to { opacity: 0.5; }
}

/* Scan counter */
.scan-counter {
  position: absolute;
  top: 12px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 4px 12px;
  z-index: 6;
}

.counter-label {
  font-size: 11px;
  color: var(--text2);
}

.counter-value {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

/* Result panel */
.result-panel {
  flex-shrink: 0;
  background: var(--bg2);
  border-top: 1px solid var(--border);
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  animation: fade-in 0.25s ease;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.result-type-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(0, 229, 160, 0.2);
}

.result-close {
  background: none;
  border: none;
  color: var(--text2);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.result-data {
  margin-bottom: 12px;
}

.result-text {
  font-size: 14px;
  color: var(--text);
  word-break: break-all;
  line-height: 1.5;
  font-family: var(--mono);
}

.result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--sans);
  transition: all 0.15s;
}

.action-btn.primary {
  background: var(--accent);
  color: var(--bg);
}

.action-btn.secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.hidden-input {
  display: none;
}

/* Slide up transition */
.slide-up-enter-active {
  animation: slide-up 0.3s ease;
}

.slide-up-leave-active {
  animation: slide-up 0.25s ease reverse;
}
</style>
