export function formatCurrency(amount: number, currency: string = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-AE').format(num)
}

export function formatDate(dateString: string, format: string = 'DD/MM/YYYY'): string {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', String(year))
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-AE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateQuoteNumber(prefix: string, number: number, suffix: string): string {
  return `${prefix}${String(number).padStart(4, '0')}${suffix}`
}

export function calculateTotals(items: Array<{ quantity: number; rate: number; taxRate?: number }>, defaultTaxRate: number = 5) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const tax = items.reduce((sum, item) => {
    const rate = item.taxRate ?? defaultTaxRate
    return sum + (item.quantity * item.rate * rate) / 100
  }, 0)
  return {
    subtotal,
    tax,
    total: subtotal + tax,
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): T {
  let inThrottle = false
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone: string): boolean {
  return /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}$/.test(phone)
}
