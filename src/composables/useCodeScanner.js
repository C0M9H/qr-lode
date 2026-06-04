import { ref, onUnmounted } from 'vue'

export function useCodeScanner() {
  const videoRef = ref(null)
  const canvasRef = ref(null)
  const isScanning = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  const flashOn = ref(false)
  const facingMode = ref('environment')
  const onCodeDetected = ref(null)
  
  let stream = null
  let animationId = null
  let reader = null
  let LuminanceSourceClass = null
  let BinaryBitmapClass = null
  let HybridBinarizerClass = null
  let MultiFormatReaderClass = null
  let DecodeHintTypeClass = null

  const initZXing = async () => {
    if (reader) return true
    
    try {
      const lib = await import('@zxing/library')
      LuminanceSourceClass = lib.LuminanceSource
      BinaryBitmapClass = lib.BinaryBitmap
      HybridBinarizerClass = lib.HybridBinarizer
      MultiFormatReaderClass = lib.MultiFormatReader
      DecodeHintTypeClass = lib.DecodeHintType
      
      reader = new MultiFormatReaderClass()
      
      // Configure hints for better detection
      const hints = new Map()
      hints.set(DecodeHintTypeClass.TRY_HARDER, true)
      hints.set(DecodeHintTypeClass.POSSIBLE_FORMATS, [
        lib.BarcodeFormat.QR_CODE,
        lib.BarcodeFormat.CODE_128,
        lib.BarcodeFormat.CODE_39,
        lib.BarcodeFormat.CODE_93,
        lib.BarcodeFormat.EAN_13,
        lib.BarcodeFormat.EAN_8,
        lib.BarcodeFormat.UPC_A,
        lib.BarcodeFormat.UPC_E,
        lib.BarcodeFormat.DATA_MATRIX,
        lib.BarcodeFormat.AZTEC,
        lib.BarcodeFormat.PDF_417,
        lib.BarcodeFormat.ITF,
      ])
      reader.setHints(hints)
      
      console.log('✓ ZXing initialized with hints')
      return true
    } catch (err) {
      console.error('✗ ZXing init failed:', err)
      throw err
    }
  }

  const decodeFrame = (canvas) => {
    if (!reader) {
      console.log('⚠️ Reader not initialized')
      return null
    }

    try {
      // Get image data from canvas
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      console.log('📊 Creating luminance data from', canvas.width, 'x', canvas.height)

      // Create luminance array manually
      const luminances = new Uint8ClampedArray(canvas.width * canvas.height)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        luminances[i >> 2] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
      }

      // Create a simple RGBLuminanceSource-like object
      const source = {
        width: canvas.width,
        height: canvas.height,
        luminances: luminances,
        getRow(y, row) {
          if (!row) row = new Uint8ClampedArray(this.width)
          const offset = y * this.width
          for (let x = 0; x < this.width; x++) {
            row[x] = this.luminances[offset + x]
          }
          return row
        },
        getMatrix() {
          return this.luminances
        },
        isCropSupported() {
          return false
        },
        crop(left, top, width, height) {
          return this
        },
        rotateCounterClockwise() {
          return this
        },
        rotateCounterClockwise45() {
          return this
        }
      }

      // Convert to LuminanceSource if needed
      let lumiSource = source
      try {
        if (LuminanceSourceClass) {
          // Try to create proper LuminanceSource
          lumiSource = Object.create(LuminanceSourceClass.prototype)
          Object.assign(lumiSource, source)
        }
      } catch (e) {
        console.log('⚠️ Using fallback luminance source')
      }

      console.log('🎯 Creating bitmap and attempting decode...')
      const bitmap = new BinaryBitmapClass(new HybridBinarizerClass(lumiSource))
      
      try {
        const result = reader.decode(bitmap)
        const text = result.getText()
        console.log('✓✓✓ FOUND:', text)
        return {
          text: text,
          format: result.getBarcodeFormat().toString()
        }
      } catch (decodeErr) {
        console.log('⏳ No code detected')
        return null
      }
    } catch (err) {
      console.error('❌ decodeFrame error:', err.message)
      return null
    }
  }

  const scan = () => {
    if (!isScanning.value || !videoRef.value || !canvasRef.value) {
      console.log('⚠️ Scan stopped:', { isScanning: isScanning.value, hasVideo: !!videoRef.value, hasCanvas: !!canvasRef.value })
      return
    }

    const video = videoRef.value
    const canvas = canvasRef.value

    console.log('📹 Video readyState:', video.readyState, 'HAVE_ENOUGH_DATA=', video.HAVE_ENOUGH_DATA)

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      console.log('✔️ Video ready, decoding...')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, 0, 0)

      const result = decodeFrame(canvas)
      
      if (result) {
        console.log('✓ Detected:', result.text, '|', result.format)
        
        if (onCodeDetected.value) {
          onCodeDetected.value(result.text, result.format)
        }
      }
    } else {
      console.log('⏳ Video not ready yet')
    }

    animationId = requestAnimationFrame(scan)
  }

  const startScanner = async () => {
    if (isScanning.value) return
    
    error.value = null
    isLoading.value = true

    try {
      await initZXing()

      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }

      const constraints = {
        video: {
          facingMode: facingMode.value,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      stream = await navigator.mediaDevices.getUserMedia(constraints)
      videoRef.value.srcObject = stream

      await new Promise(resolve => {
        const check = () => {
          if (videoRef.value && videoRef.value.readyState >= 2) {
            resolve()
          } else {
            setTimeout(check, 50)
          }
        }
        check()
      })

      isScanning.value = true
      isLoading.value = false
      console.log('✓ Scanner started')
      
      scan()
    } catch (err) {
      isLoading.value = false
      console.error('✗ Start error:', err)
      
      if (err.name === 'NotAllowedError') {
        error.value = 'Cameră refuzată'
      } else if (err.name === 'NotFoundError') {
        error.value = 'Nicio cameră'
      } else {
        error.value = err.message
      }
    }
  }

  const stopScanner = () => {
    isScanning.value = false
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
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
      stopScanner()
      await startScanner()
    }
  }

  const toggleFlash = async () => {
    if (!stream) return
    try {
      const track = stream.getVideoTracks()[0]
      if (!track) return
      const constraints = { advanced: [{ torch: !flashOn.value }] }
      await track.applyConstraints(constraints)
      flashOn.value = !flashOn.value
    } catch (err) {
      console.error('Flash error:', err)
    }
  }

  const scanImage = async (file) => {
    try {
      await initZXing()
      
      return new Promise((resolve) => {
        const fileReader = new FileReader()
        fileReader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0)

              const result = decodeFrame(canvas)
              resolve(result)
            } catch (err) {
              console.error('Image decode error:', err)
              resolve(null)
            }
          }
          img.src = e.target.result
        }
        fileReader.readAsDataURL(file)
      })
    } catch (err) {
      console.error('Image scan error:', err)
      return null
    }
  }

  onUnmounted(() => {
    stopScanner()
  })

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
