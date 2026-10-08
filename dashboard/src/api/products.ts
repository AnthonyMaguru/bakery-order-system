import type { Product } from '../types/api'
import { api } from './client'

export const listProducts = () => api<Product[]>('/products')
