import { humanize } from '../lib/format'
import type { OrderStatus } from '../types/api'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{humanize(status)}</span>
}
