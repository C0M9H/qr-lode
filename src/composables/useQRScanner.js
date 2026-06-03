import { ref, onUnmounted } from 'vue'

export function useQRScanner() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isScanning = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  const flashOn = ref(false)
  const facingMode = ref('environment') // 'environment' = back, 'user' = front
  let stream = null
  let animationId = null
  let jsQR = null

  // Lazy load jsQR
  const loadJsQR = async () => {
    if (!jsQR) {
      const module = await import('jsqr')
      jsQR = module.default
    }
    return jsQR
  }

  const startScanner = async () => {
    error.value = null
    isLoading.value = true

    try {
      await loadJsQR()

      // Stop existing stream
      if (stream) stopStream()

      const constraints = {
        video: {
          facingMode: facingMode.value,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false
      }

      stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play()
        isScanning.value = true
        isLoading.value = false
        requestAnimationFrame(scanFrame)
      }
    } catch (err) {
      isLoading.value = false
      if (err.name === 'NotAllowedError') {
        error.value = 'Accesul la cameră a fost refuzat. Permite accesul în setările browserului.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'Nu s-a găsit nicio cameră pe acest dispozitiv.'
      } else if (err.name === 'NotSupportedError') {
        error.value = 'Camera nu este suportată în acest browser.'
      } else {
        error.value = `Eroare cameră: ${err.message}`
      }
    }
  }

  const scanFrame = () => {
    if (!isScanning.value || !videoRef.value || !canvasRef.value) return

    const video = videoRef.value
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      if (jsQR) {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        })

        if (code && code.data) {
          return code.data // Found!
        }
      }
    }

    animationId = requestAnimationFrame(scanFrame)
    return null
  }

  const scanFrameAsync = () => {
    return new Promise((resolve) => {
      const loop = () => {
        if (!isScanning.value || !videoRef.value || !canvasRef.value) {
          resolve(null)
          return
        }

        const video = videoRef.value
        const canvas = canvasRef.value
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          if (jsQR) {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            })
            if (code && code.data) {
              resolve(code.data)
              return
            }
          }
        }
        animationId = requestAnimationFrame(loop)
      }
      animationId = requestAnimationFrame(loop)
    })
  }

  const stopScanner = () => {
    isScanning.value = false
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    stopStream()
  }

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
    }
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
  }

  const toggleCamera = async () => {
    facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
    if (isScanning.value) {
      await startScanner()
    }
  }

  const toggleFlash = async () => {
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return

    try {
      const capabilities = track.getCapabilities()
      if (capabilities.torch) {
        flashOn.value = !flashOn.value
        await track.applyConstraints({ advanced: [{ torch: flashOn.value }] })
      }
    } catch {
      // Flash not supported
    }
  }

  const scanImage = async (file) => {
    await loadJsQR()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          resolve(code ? code.data : null)
        }
        img.onerror = () => reject(new Error('Nu s-a putut încărca imaginea'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('Nu s-a putut citi fișierul'))
      reader.readAsDataURL(file)
    })
  }

  onUnmounted(() => {
    stopScanner()
  })

  return {
    videoRef,
    canvasRef,
    isScanning,
    isLoading,
    error,
    flashOn,
    facingMode,
    startScanner,
    stopScanner,
    toggleCamera,
    toggleFlash,
    scanImage,
    scanFrameAsync
  }
}
