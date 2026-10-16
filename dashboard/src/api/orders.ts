import type { Order, OrderStatus, OrderSummary, OrdersSummary, PaymentMethod, Quotation } from '../types/api'
import { api, query, send } from './client'

export interface OrderFilters {
  status?: OrderStatus
  from?: string
  to?: string
  q?: string
}

export const listBakeryOrders = (bakeryId: string, filters: OrderFilters = {}) =>
  api<OrderSummary[]>(`/bakeries/${bakeryId}/orders${query({ ...filters })}`)

export const getOrdersSummary = (bakeryId: string) => api<OrdersSummary>(`/bakeries/${bakeryId}/orders/summary`)

export const getOrder = (id: string) => api<Order>(`/orders/${id}`)

export const updateOrderStatus = (id: string, status: OrderStatus) => send<Order>('PATCH', `/orders/${id}/status`, { status })

export const sendQuotation = (id: string, amount: number, note?: string) =>
  send<Quotation>('POST', `/orders/${id}/quotations`, { amount, note: note || undefined })

export const cancelOrder = (id: string, reason: string) => send<Order>('POST', `/orders/${id}/cancel`, { reason })

export const recordPayment = (id: string, payment: { amount: number; method: PaymentMethod; note?: string }) =>
  send<Order>('POST', `/orders/${id}/payments`, { ...payment, note: payment.note || undefined })

export const removePayment = (id: string, paymentId: string) => send<Order>('DELETE', `/orders/${id}/payments/${paymentId}`)

export const addComment = (id: string, body: string) => send('POST', `/orders/${id}/comments`, { body })
