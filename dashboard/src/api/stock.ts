import type { StockItem } from '../types/api'
import { api, send } from './client'

export type StockInput = Partial<Pick<StockItem, 'name' | 'unit' | 'quantity' | 'lowAt'>>

export const listStock = (bakeryId: string) => api<StockItem[]>(`/bakeries/${bakeryId}/stock`)

export const createStockItem = (bakeryId: string, data: StockInput) => send<StockItem>('POST', `/bakeries/${bakeryId}/stock`, data)

export const updateStockItem = (bakeryId: string, itemId: string, data: StockInput) =>
  send<StockItem>('PATCH', `/bakeries/${bakeryId}/stock/${itemId}`, data)

export const deleteStockItem = (bakeryId: string, itemId: string) => send<null>('DELETE', `/bakeries/${bakeryId}/stock/${itemId}`)
