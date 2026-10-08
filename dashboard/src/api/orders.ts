import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types/api'
import { api } from './client'

export const listOrders = (status?: OrderStatus) =>
  api<Order[]>(`/orders${status ? `?status=${status}` : ''}`)

export const getOrder = (id: string) => api<Order>(`/orders/${id}`)

export const updateOrderStatus = (id: string, status: OrderStatus) =>
  api<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const createQuotation = (id: string, amountUgx: number, note?: string) =>
  api(`/orders/${id}/quotations`, { method: 'POST', body: JSON.stringify({ amountUgx, note }) })

export const updatePayment = (
  id: string,
  payment: { paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod; amountPaidUgx?: number },
) => api<Order>(`/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify(payment) })
