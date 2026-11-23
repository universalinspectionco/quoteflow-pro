"use client"

import { motion } from 'motion/react'
import {
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { formatCurrency, formatDate } from '@/utils/formatters'

const statCards = [
  { id: 'total-quotes', label: 'Total Quotations', icon: FileText, color: 'from-primary to-secondary', trend: '+12%', trendLabel: 'vs last month' },
  { id: 'revenue', label: 'Total Revenue', icon: DollarSign, color: 'from-success to-emerald-400', trend: '+23%', trendLabel: 'vs last month' },
  { id: 'conversion', label: 'Conversion Rate', icon: TrendingUp, color: 'from-secondary to-primary', trend: '+5.2%', trendLabel: 'vs last quarter' },
  { id: 'clients', label: 'Active Clients', icon: Users, color: 'from-accent to-rose-400', trend: '+8', trendLabel: 'new this month' },
] as const

const recentActivity = [
  { id: 1, type: 'quote_created', title: 'New quotation created', subtitle: 'UIC-Q-1042 for Al Maktoum Industries', time: '2 hours ago', status: 'draft' },
  { id: 2, type: 'quote_sent', title: 'Quotation sent', subtitle: 'UIC-Q-1038 to Dubai Petroleum', time: '5 hours ago', status: 'sent' },
  { id: 3, type: 'quote_approved', title: 'Quotation approved', subtitle: 'UIC-Q-1025 by Emirates Steel', time: '1 day ago', status: 'approved' },
  { id: 4, type: 'quote_rejected', title: 'Quotation needs revision', subtitle: 'UIC-Q-1012 rejected by ADNOC', time: '2 days ago', status: 'rejected' },
  { id: 5, type: 'price_updated', title: 'Price book updated', subtitle: 'Valve items rates revised', time: '3 days ago', status: 'info' },
]

export function Dashboard() {
  const { quotations, settings, setView } = useStore()

  const stats = {
    totalQuotes: quotations.length,
    totalRevenue: quotations.filter(q => q.status === 'approved').reduce((sum, q) => sum + q.total, 0),
    conversionRate: quotations.length > 0
      ? ((quotations.filter(q => q.status === 'approved').length / quotations.length) * 100).toFixed(1)
      : '0.0',
    activeClients: new Set(quotations.map(q => q.client.id)).size,
  }

  const statusCounts = {
    draft: quotations.filter(q => q.status === 'draft').length,
    sent: quotations.filter(q => q.status === 'sent').length,
    approved: quotations.filter(q => q.status === 'approved').length,
    rejected: quotations.filter(q => q.status === 'rejected').length,
    expired: quotations.filter(q => q.status === 'expired').length,
  }

  const recentQuotes = [...quotations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)

  return (
    <div className="space-y-6 animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-text-muted mt-1">Welcome back! Here's what's happening with your quotations.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('editor')}
          className="flex items-center gap-2 glass-hover px-4 py-2 rounded-xl font-medium self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="glass-elevated p-5 rounded-2xl border border-border-subtle hover:shadow-glass-hover transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-1 bg-gradient-to-r {card.color} bg-clip-text text-transparent">
                  {card.id === 'total-quotes' && stats.totalQuotes}
                  {card.id === 'revenue' && formatCurrency(stats.totalRevenue, settings.defaults.currency)}
                  {card.id === 'conversion' && `${stats.conversionRate}%`}
                  {card.id === 'clients' && stats.activeClients}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-success text-sm font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {card.trend}
              </span>
              <span className="text-text-muted text-sm">{card.trendLabel}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
        >
          <div className="p-5 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Quotations</h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('quotes')}
              className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-3 h-3" />
            </motion.button>
          </div>
          <div className="divide-y divide-border-subtle">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="p-5 hover:bg-bg-secondary transition-colors cursor-pointer group"
                  onClick={() => { setView('editor'); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        quote.status === 'approved' ? 'bg-success/20 text-success' :
                        quote.status === 'sent' ? 'bg-primary/20 text-primary' :
                        quote.status === 'draft' ? 'bg-warning/20 text-warning' :
                        quote.status === 'rejected' ? 'bg-error/20 text-error' :
                        'bg-text-muted/20 text-text-muted'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{quote.quoteNumber}</p>
                        <p className="text-sm text-text-muted">{quote.client.name} • {formatDate(quote.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        quote.status === 'approved' ? 'bg-success/20 text-success' :
                        quote.status === 'sent' ? 'bg-primary/20 text-primary' :
                        quote.status === 'draft' ? 'bg-warning/20 text-warning' :
                        quote.status === 'rejected' ? 'bg-error/20 text-error' :
                        'bg-text-muted/20 text-text-muted'
                      }`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                      <span className="font-semibold text-text-primary">{formatCurrency(quote.total, settings.defaults.currency)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-text-muted/50 mb-4" />
                <h3 className="text-lg font-medium text-text-secondary mb-1">No quotations yet</h3>
                <p className="text-text-muted mb-4">Create your first quotation to get started</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('editor')}
                  className="glass-hover px-6 py-2 rounded-xl font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Quotation
                </motion.button>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
        >
          <div className="p-5 border-b border-border-subtle">
            <h2 className="text-lg font-semibold">Status Overview</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { key: 'draft', label: 'Draft', count: statusCounts.draft, color: 'warning', icon: Clock },
              { key: 'sent', label: 'Sent', count: statusCounts.sent, color: 'primary', icon: ArrowUpRight },
              { key: 'approved', label: 'Approved', count: statusCounts.approved, color: 'success', icon: CheckCircle },
              { key: 'rejected', label: 'Rejected', count: statusCounts.rejected, color: 'error', icon: XCircle },
              { key: 'expired', label: 'Expired', count: statusCounts.expired, color: 'text-muted', icon: AlertTriangle },
            ].map((status, index) => (
              <motion.div
                key={status.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className="flex items-center justify-between p-3 glass-hover rounded-xl group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${status.color}/20 text-${status.color}`}>
                    <status.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-text-secondary">{status.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-text-primary">{status.count}</span>
                  <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: stats.totalQuotes > 0 ? `${(status.count / stats.totalQuotes) * 100}%` : '0%' }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
      >
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Filter className="w-5 h-5 text-text-muted" />
        </div>
        <div className="divide-y divide-border-subtle">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="p-5 flex items-center gap-4 hover:bg-bg-secondary transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activity.status === 'approved' ? 'bg-success/20 text-success' :
                activity.status === 'rejected' ? 'bg-error/20 text-error' :
                activity.status === 'sent' ? 'bg-primary/20 text-primary' :
                activity.status === 'info' ? 'bg-secondary/20 text-secondary' :
                'bg-warning/20 text-warning'
              }`}>
                {activity.status === 'approved' && <CheckCircle className="w-5 h-5" />}
                {activity.status === 'rejected' && <XCircle className="w-5 h-5" />}
                {activity.status === 'sent' && <ArrowUpRight className="w-5 h-5" />}
                {activity.status === 'info' && <FileText className="w-5 h-5" />}
                {activity.status === 'draft' && <FileText className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{activity.title}</p>
                <p className="text-sm text-text-muted truncate">{activity.subtitle}</p>
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">{activity.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}