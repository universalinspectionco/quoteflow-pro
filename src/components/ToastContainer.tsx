"use client"

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'text-success border-success/30 bg-success/10',
  error: 'text-error border-error/30 bg-error/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  info: 'text-primary border-primary/30 bg-primary/10',
}

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: string) => void }) {
  const Icon = icons[toast.type]
  const duration = toast.duration && toast.duration > 0 ? toast.duration : 3500

  useEffect(() => {
    const timer = window.setTimeout(() => onRemove(toast.id), duration)
    return () => window.clearTimeout(timer)
  }, [toast.id, duration, onRemove])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`pointer-events-auto w-full glass-elevated rounded-xl p-3.5 border shadow-elevated flex items-start gap-3 overflow-hidden ${colors[toast.type]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 pr-5">
        <p className="font-semibold text-sm leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-text-secondary mt-1 break-words leading-snug">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors absolute right-2 top-2"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-0.5 bg-white/30"
      />
    </motion.div>
  )
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex w-[min(92vw,360px)] max-w-[360px] flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.slice(0, 3).map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}
