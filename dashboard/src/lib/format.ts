const ugx = new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 })

export const formatUgx = (amount: number | null) => (amount == null ? '—' : ugx.format(amount))

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })

// "DEPOSIT_PAID" -> "Deposit paid"
export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')
