import type { Product } from '../types/api'
import { api, send } from './client'

export type ProductInput = Omit<Product, 'id' | 'bakeryId'>

// Staff see hidden products too.
export const listProducts = (bakeryId: string) => api<Product[]>(`/bakeries/${bakeryId}/products?all=true`)

export const createProduct = (bakeryId: string, data: Partial<ProductInput>) =>
  send<Product>('POST', `/bakeries/${bakeryId}/products`, data)

export const updateProduct = (bakeryId: string, productId: string, data: Partial<ProductInput>) =>
  send<Product>('PATCH', `/bakeries/${bakeryId}/products/${productId}`, data)
