import { Link, useParams } from 'react-router-dom'
import { getOrder, updateOrderStatus } from '../api/orders'
import { StatusBadge } from '../components/StatusBadge'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatUgx, humanize } from '../lib/format'
import { ORDER_STATUSES, type OrderStatus } from '../types/api'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const { data: order, error, loading, reload } = useAsync(() => getOrder(id), [id])

  if (loading) return <p>Loading…</p>
  if (error || !order) return <p className="error">{error ?? 'Order not found'}</p>

  const changeStatus = async (status: OrderStatus) => {
    await updateOrderStatus(order.id, status)
    reload()
  }

  // TODO(dashboard lead): quotation form (createQuotation) and payment form (updatePayment).
  return (
    <section>
      <p><Link to="/orders">← All orders</Link></p>
      <div className="page-header">
        <h1>{order.occasion ?? humanize(order.type)} order</h1>
        <StatusBadge status={order.status} />
      </div>

      <label>
        Move to{' '}
        <select value={order.status} onChange={(e) => changeStatus(e.target.value as OrderStatus)}>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{humanize(s)}</option>
          ))}
        </select>
      </label>

      <dl className="details">
        <dt>Due</dt><dd>{formatDate(order.dueDate)}</dd>
        <dt>Customer</dt><dd>{order.customer.name ?? '—'} · {order.customer.phone ?? order.customer.email ?? '—'}</dd>
        <dt>Fulfilment</dt><dd>{humanize(order.fulfilment)}{order.deliveryAddress && ` — ${order.deliveryAddress}`}</dd>
        <dt>Flavour</dt><dd>{order.flavour ?? '—'}</dd>
        <dt>Icing</dt><dd>{order.icing ?? '—'}</dd>
        <dt>Size</dt><dd>{order.size ?? '—'}</dd>
        <dt>Colours</dt><dd>{order.colours ?? '—'}</dd>
        <dt>Theme</dt><dd>{order.theme ?? '—'}</dd>
        <dt>Inscription</dt><dd>{order.inscription ?? '—'}</dd>
        <dt>Budget</dt><dd>{formatUgx(order.budgetUgx)}</dd>
        <dt>Notes</dt><dd>{order.notes ?? '—'}</dd>
        <dt>Payment</dt><dd>{humanize(order.paymentStatus)} · paid {formatUgx(order.amountPaidUgx)}</dd>
        <dt>Latest quote</dt><dd>{formatUgx(order.quotations?.[0]?.amountUgx ?? null)}</dd>
      </dl>

      {order.images && order.images.length > 0 && (
        <div className="images">
          {order.images.map((img) => (
            <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
              <img src={img.url} alt="Inspiration" />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
