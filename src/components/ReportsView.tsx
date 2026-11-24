"use client"

import React from 'react'
import { motion } from 'motion/react'
import { useState, useMemo } from 'react'
import {
  BarChart3, TrendingUp, DollarSign, Users, FileText, Download, Filter, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useStore } from '@/services/store'
import { exportAllTimeReport } from '@/utils/quotationExport'
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ReportsView() {
  const { quotations, priceBook, settings, addToast } = useStore()
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [chartType, setChartType] = useState<'revenue' | 'quotes' | 'clients' | 'conversion'>('revenue')

  const filteredQuotes = useMemo(() => {
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(0)
    }
    return quotations.filter(q => new Date(q.date) >= startDate)
  }, [quotations, dateRange])

  const monthlyData = useMemo(() => {
    const data: Record<string, { revenue: number; quotes: number; clients: Set<string>; approved: number }> = {}
    const now = new Date()
    const monthsBack = dateRange === 'month' ? 12 : dateRange === 'quarter' ? 12 : 24

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
      data[key] = { revenue: 0, quotes: 0, clients: new Set(), approved: 0 }
    }

    filteredQuotes.forEach(q => {
      const date = new Date(q.date)
      const key = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
      if (data[key]) {
        data[key].revenue += q.status === 'approved' ? q.total : 0
        data[key].quotes += 1
        data[key].clients.add(q.client.id)
        if (q.status === 'approved') data[key].approved += 1
      }
    })

    return Object.entries(data).map(([month, values]) => ({
      month,
      revenue: values.revenue,
      quotes: values.quotes,
      clients: values.clients.size,
      conversion: values.quotes > 0 ? (values.approved / values.quotes) * 100 : 0,
    }))
  }, [filteredQuotes, dateRange])

  const stats = useMemo(() => {
    const totalRevenue = filteredQuotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + q.total, 0)
    const totalQuotes = filteredQuotes.length
    const approvedQuotes = filteredQuotes.filter(q => q.status === 'approved').length
    const conversion = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0
    const uniqueClients = new Set(filteredQuotes.map(q => q.client.id)).size
    const avgQuoteValue = approvedQuotes > 0 ? totalRevenue / approvedQuotes : 0

    return { totalRevenue, totalQuotes, approvedQuotes, conversion, uniqueClients, avgQuoteValue }
  }, [filteredQuotes])

  const topClients = useMemo(() => {
    const clientStats: Record<string, { name: string; revenue: number; quotes: number }> = {}
    filteredQuotes.filter(q => q.status === 'approved').forEach(q => {
      if (!clientStats[q.client.id]) {
        clientStats[q.client.id] = { name: q.client.name, revenue: 0, quotes: 0 }
      }
      clientStats[q.client.id].revenue += q.total
      clientStats[q.client.id].quotes += 1
    })
    return Object.values(clientStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredQuotes])

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = { draft: 0, sent: 0, approved: 0, rejected: 0, expired: 0 }
    filteredQuotes.forEach(q => { breakdown[q.status]++ })
    return breakdown
  }, [filteredQuotes])

  const handleExport = async () => {
    addToast({ type: 'info', title: 'Export Started', message: 'Generating UIC all-time report...' })
    try {
      await exportAllTimeReport(quotations, settings)
      addToast({ type: 'success', title: 'Exported', message: 'All-Time Quotation Report downloaded' })
    } catch (err) {
      console.error('Report export failed:', err)
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate the report.' })
    }
  }

  return (
    <div className="h-full flex flex-col animate-in">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-text-muted mt-1">Deep insights into your quotation performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="glass-hover px-4 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue, settings.defaults.currency), icon: DollarSign, color: 'from-success to-emerald-400', trend: '+12.5%' },
          { label: 'Quotations', value: formatNumber(stats.totalQuotes), icon: FileText, color: 'from-primary to-secondary', trend: '+8.2%' },
          { label: 'Conversion Rate', value: `${stats.conversion.toFixed(1)}%`, icon: TrendingUp, color: 'from-secondary to-primary', trend: '+2.1%' },
          { label: 'Active Clients', value: formatNumber(stats.uniqueClients), icon: Users, color: 'from-accent to-rose-400', trend: '+3' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.05 + index * 0.05 }}
            className="glass-elevated p-5 rounded-2xl border border-border-subtle"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 bg-gradient-to-r {stat.color} bg-clip-text text-transparent">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-success text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
              <span className="text-text-muted text-sm">vs previous period</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
        >
          <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold">Revenue & Activity Trends</h2>
            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as typeof dateRange)}
                className="glass-hover px-3 py-2 rounded-xl text-sm focus-ring border border-border-subtle bg-bg-secondary"
              >
                <option value="month">Last 12 Months</option>
                <option value="quarter">Last 4 Quarters</option>
                <option value="year">Last 2 Years</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          <div className="p-5 h-[350px]">
            <RevenueChart data={monthlyData} type={chartType} />
            <div className="flex items-center justify-center gap-2 mt-4">
              {['revenue', 'quotes', 'clients', 'conversion'].map(type => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setChartType(type as 'revenue' | 'quotes' | 'clients' | 'conversion')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    chartType === type
                      ? 'bg-primary text-white shadow-glow'
                      : 'glass-hover text-text-secondary'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
        >
          <div className="p-5 border-b border-border-subtle">
            <h2 className="text-lg font-semibold">Status Breakdown</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { key: 'approved', label: 'Approved', color: 'success', icon: CheckCircle },
              { key: 'sent', label: 'Sent', color: 'primary', icon: Mail },
              { key: 'draft', label: 'Draft', color: 'warning', icon: FileText },
              { key: 'rejected', label: 'Rejected', color: 'error', icon: XCircle },
              { key: 'expired', label: 'Expired', color: 'text-muted', icon: AlertTriangle },
            ].map((status, index) => (
              <motion.div
                key={status.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="flex items-center justify-between p-3 glass-hover rounded-xl group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${status.color}/20 text-${status.color}`}>
                    <status.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-text-secondary">{status.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-text-primary">{statusBreakdown[status.key]}</span>
                  <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: stats.totalQuotes > 0 ? `${(statusBreakdown[status.key] / stats.totalQuotes) * 100}%` : '0%' }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-elevated rounded-2xl border border-border-subtle overflow-hidden"
        >
          <div className="p-5 border-b border-border-subtle">
            <h2 className="text-lg font-semibold">Top Clients by Revenue</h2>
          </div>
          <div className="p-5 space-y-4">
            {topClients.length > 0 ? (
              topClients.map((client, index) => (
                <motion.div
                  key={client.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-center justify-between p-3 glass-hover rounded-xl group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{client.name}</p>
                      <p className="text-sm text-text-muted">{client.quotes} quotations</p>
                    </div>
                  </div>
                  <span className="font-semibold text-text-primary">{formatCurrency(client.revenue, settings.defaults.currency)}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No approved quotations in this period</p>
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
            <h2 className="text-lg font-semibold">Quick Stats</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="glass-hover p-4 rounded-xl border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Avg. Quote Value</p>
                    <p className="font-bold text-text-primary">{formatCurrency(stats.avgQuoteValue, settings.defaults.currency)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-hover p-4 rounded-xl border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Approved Quotes</p>
                    <p className="font-bold text-text-primary">{stats.approvedQuotes} / {stats.totalQuotes}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-hover p-4 rounded-xl border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/20 text-success flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Price Book Items</p>
                    <p className="font-bold text-text-primary">{priceBook.length}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-hover p-4 rounded-xl border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Unique Clients (Period)</p>
                    <p className="font-bold text-text-primary">{stats.uniqueClients}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function RevenueChart({ data, type }: { data: any[]; type: string }) {
  const maxValue = Math.max(...data.map(d => d[type] || 0), 1)
  const height = 300
  const padding = 20
  const chartWidth = '100%'

  const pathD = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * 760
    const y = height - padding - (d[type] / maxValue) * (height - padding * 2)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const areaD = `${pathD} L 780 ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div className="relative w-full h-full" style={{ width: chartWidth, height }}>
      <svg viewBox="0 0 800 300" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {React.createElement('rect', {
          x: padding,
          y: padding,
          width: 760,
          height: height - padding * 2,
          fill: 'transparent'
        })}
        {React.createElement('path', {
          d: pathD,
          stroke: 'var(--color-primary)',
          strokeWidth: 2,
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })}
        {React.createElement('path', {
          d: areaD,
          fill: 'url(#chartGradient)'
        })}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * 760
          const y = height - padding - (d[type] / maxValue) * (height - padding * 2)
          return React.createElement('circle', {
            key: i,
            cx: x,
            cy: y,
            r: 4,
            fill: 'var(--color-primary)',
            stroke: 'var(--color-bg-primary)',
            strokeWidth: 2
          })
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-text-muted">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
          <span key={i} className="text-center">{d.month}</span>
        ))}
      </div>
    </div>
  )
}

import { CheckCircle, Mail, XCircle, AlertTriangle } from 'lucide-react'