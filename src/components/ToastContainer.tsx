"use client"

import React from 'react'
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

interface ToastContainerProps {
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  // Show max 3 toasts at a time, newest first
  const visibleToasts = toasts.slice(0, 3)

  return (
    <AnimatePresence>
      {visibleToasts.map((toast, index) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, delay: index * 0.1 }}
          className={`min-w-[300px] max-w-md glass-elevated rounded-xl p-4 border shadow-elevated flex items-start gap-3 ${colors[toast.type]} relative`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex-shrink-0 mt-0.5">
            {React.createElement(icons[toast.type], { className: "w-5 h-5" })}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.message && <p className="text-sm text-text-secondary mt-0.5">{toast.message}</p>}
          </div>
          <motion.button
            onClick={() => onRemove(toast.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors absolute right-2 top-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </motion.button>
          {/* Auto-dismiss progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: (toast.duration || 4000), ease: 'linear' }}
            className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-bl-xl rounded-br-xl"
          />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
