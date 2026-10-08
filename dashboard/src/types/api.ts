// Mirrors docs/api.md. Update both together.

export type Role = 'CUSTOMER' | 'STAFF'
export type OrderType = 'STANDARD' | 'CUSTOM' | 'BULK'
export type OrderStatus = 'SUBMITTED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
export type Fulfilment = 'PICKUP' | 'DELIVERY'
export type PaymentStatus = 'UNPAID' | 'DEPOSIT_PAID' | 'PAID'
export type PaymentMethod = 'CASH' | 'MOBILE_MONEY'

export const ORDER_STATUSES: OrderStatus[] = ['SUBMITTED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']

export interface User {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: Role
}

export interface Product {
  id: string
  name: string
  description: string | null
  category: string
  basePriceUgx: number | null
  imageUrl: string | null
  isActive: boolean
}

export interface Quotation {
  id: string
  amountUgx: number
  note: string | null
  createdAt: string
}

export interface OrderComment {
  id: string
  body: string
  createdAt: string
  author: Pick<User, 'id' | 'name' | 'role'>
}

export interface Order {
  id: string
  type: OrderType
  status: OrderStatus
  occasion: string | null
  flavour: string | null
  icing: string | null
  size: string | null
  colours: string | null
  theme: string | null
  inscription: string | null
  notes: string | null
  budgetUgx: number | null
  dueDate: string
  fulfilment: Fulfilment
  deliveryAddress: string | null
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  amountPaidUgx: number
  createdAt: string
  updatedAt: string
  customer: Pick<User, 'id' | 'name' | 'phone' | 'email'>
  items?: { id: string; quantity: number; product: Pick<Product, 'id' | 'name'> }[]
  images?: { id: string; url: string }[]
  quotations?: Quotation[]
  comments?: OrderComment[]
}
