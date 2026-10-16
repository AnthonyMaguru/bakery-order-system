import { STATUS_LABELS } from '../lib/order-flow'
import type { OrderStatus, PaymentStatus, StockLevel } from '../types/api'

const STATUS_TONES: Record<OrderStatus, string> = {
  SUBMITTED: 'badge-info',
  QUOTED: 'badge-accent',
  CONFIRMED: 'badge-violet',
  PREPARING: 'badge-warn',
  READY: 'badge-ok',
  COMPLETED: '',
  CANCELLED: 'badge-danger',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</span>
}

const PAYMENT: Record<PaymentStatus, [string, string]> = {
  UNPAID: ['Unpaid', 'badge-danger'],
  DEPOSIT_PAID: ['Deposit paid', 'badge-warn'],
  PAID: ['Paid', 'badge-ok'],
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const [label, tone] = PAYMENT[status]
  return <span className={`badge ${tone}`}>{label}</span>
}

const STOCK: Record<StockLevel, [string, string]> = {
  OK: ['In stock', 'badge-ok'],
  LOW: ['Running low', 'badge-warn'],
  OUT: ['Out of stock', 'badge-danger'],
}

export function StockBadge({ level }: { level: StockLevel }) {
  const [label, tone] = STOCK[level]
  return <span className={`badge ${tone}`}>{label}</span>
}
