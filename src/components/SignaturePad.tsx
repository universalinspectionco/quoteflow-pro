"use client"

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent } from 'react'
import { Eraser, PenLine, Upload } from 'lucide-react'

/**
 * Upload or draw a signature and receive it as a base64 data URL.
 * PNG/JPG/SVG uploads are stored verbatim; drawings are exported as PNG.
 */
export function SignaturePad({
  value,
  onChange,
  label = 'Signature',
}: {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const [hint, setHint] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const context = canvas.getContext('2d')
    if (!context) return
    const image = new Image()
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = value
  }, [value])

  const position = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const point = position(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.5
    context.strokeStyle = '#111827'
    drawing.current = true
    canvas.setPointerCapture(event.pointerId)
  }

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext('2d')
    if (!drawing.current || !context) return
    const point = position(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
    setHint('Signature cleared')
  }

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpeg|jpg|svg\+xml)$/i.test(file.type)) {
      setHint('Please choose a PNG, JPG or SVG image')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setHint('Signature image must be smaller than 3 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange(String(reader.result || ''))
      setHint(`${file.name} uploaded`)
    }
    reader.onerror = () => setHint('Could not read that image')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={upload}
            className="hidden"
            aria-label={`Upload ${label} image`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass-hover px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            Upload PNG/JPG/SVG
          </button>
          <button
            type="button"
            onClick={clear}
            className="glass-hover px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Eraser className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerLeave={finish}
        className="w-full h-40 rounded-xl border border-border-subtle bg-white cursor-crosshair touch-none"
        aria-label={`Draw ${label}`}
      />
      {value ? (
        <img src={value} alt={`${label} preview`} className="max-h-24 rounded-lg border border-border-subtle" />
      ) : (
        <p className="text-xs text-text-muted flex items-center gap-1">
          <PenLine className="w-3 h-3" />
          Draw above or upload a local signature image.
        </p>
      )}
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  )
}
