"use client"

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'

/** Compact disclosure used to keep secondary form options out of the main flow. */
export function CollapsibleSection({
  title,
  icon,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  icon?: ReactNode
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-bg-secondary/60 transition-colors"
        aria-expanded={open}
      >
        {icon && <span className="text-text-muted flex-shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-text-primary">{title}</span>
          {summary && <span className="block text-xs text-text-muted mt-0.5 truncate">{summary}</span>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} className="text-text-muted">
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border-subtle">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
