import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../api/orders'
import { StatusBadge } from '../components/StatusBadge'
import { useAsync } from '../hooks/useAsync'
import { formatDate, humanize } from '../lib/format'
import { ORDER_STATUSES, type OrderStatus } from '../types/api'

export function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const { data: orders, error, loading } = useAsync(() => listOrders(status || undefined), [status])

  return (
    <section>
      <div className="page-header">
        <h1>Orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{humanize(s)}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {orders && orders.length === 0 && <p>No orders yet.</p>}
      {orders && orders.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Due</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Occasion</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to={`/orders/${o.id}`}>{formatDate(o.dueDate)}</Link></td>
                <td>{o.customer.name ?? o.customer.phone ?? '—'}</td>
                <td>{humanize(o.type)}</td>
                <td>{o.occasion ?? '—'}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{humanize(o.paymentStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
