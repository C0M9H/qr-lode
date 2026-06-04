import { ref, onUnmounted } from 'vue'

export function useCodeScanner() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isScanning = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  const flashOn = ref(false)
  const facingMode = ref('environment') // 'environment' = back, 'user' = front
  const onCodeDetected = ref(null) // Callback for detected codes
  let stream = null
  let animationId = null
  let zxingModule = null
  let codeReader = null

  // Lazy load zxing
  const loadZxing = async () => {
    if (!zxingModule) {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        zxingModule = { BrowserMultiFormatReader }
        codeReader = new BrowserMultiFormatReader()
      } catch (err) {
        console.error('Failed to load zxing:', err)
        throw new Error('Nu s-a putut încărca biblioteca de scanare')
      }
    }
    return zxingModule
  }

  const startScanner = async () => {
    error.value = null
    isLoading.value = true

    try {
      await loadZxing()

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
        await new Promise(resolve => {
          videoRef.value.onplay = resolve
        })
        isScanning.value = true
        isLoading.value = false
        scanFrame()
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

  const decodeImage = (imageData) => {
    if (!codeReader) return null

    try {
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = imageData.width
      tmpCanvas.height = imageData.height
      const tmpCtx = tmpCanvas.getContext('2d')
      tmpCtx.putImageData(imageData, 0, 0)
      
      try {
        const result = codeReader.decodeFromCanvas(tmpCanvas)
        if (result) {
          return {
            data: result.getText(),
            format: result.getBarcodeFormat().toString()
          }
        }
      } catch (decodeErr) {
        return null
      }
    } catch (err) {
      console.warn('Decode error:', err.message)
      return null
    }
  }

  const scanFrame = () => {
    if (!isScanning.value || !videoRef.value || !canvasRef.value) {
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
      const code = decodeImage(imageData)

      if (code && onCodeDetected.value) {
        onCodeDetected.value(code.data, code.format)
        // Pause before next scan
        setTimeout(() => {
          if (isScanning.value) {
            animationId = requestAnimationFrame(scanFrame)
          }
        }, 1500)
        return
      }
    }

    animationId = requestAnimationFrame(scanFrame)
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
          const code = decodeImage(imageData)
          
          if (code) {
            resolve(code)
            return
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

    try {
      const track = stream.getVideoTracks()[0]
      if (!track) return

      const settings = track.getSettings()
      const hasFlash = 'torch' in settings

      if (!hasFlash) {
        error.value = 'Dispozitivul nu suportă lanterna'
        return
      }

      const constraints = { advanced: [{ torch: !flashOn.value }] }
      await track.applyConstraints(constraints)
      flashOn.value = !flashOn.value
    } catch (err) {
      console.warn('Flash toggle error:', err)
      error.value = 'Nu s-a putut activa lanterna'
    }
  }

  const scanImage = async (imageFile) => {
    try {
      await loadZxing()
      return new Promise((resolve) => {
        const fileReader = new FileReader()
        fileReader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = decodeImage(imageData)
            resolve(code)
          }
          img.src = e.target.result
        }
        fileReader.readAsDataURL(imageFile)
      })
    } catch (err) {
      console.error('Error scanning image:', err)
      return null
    }
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
    onCodeDetected,
    startScanner,
    stopScanner,
    toggleCamera,
    toggleFlash,
    scanImage,
  }
}
