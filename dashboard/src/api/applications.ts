import { api, send } from './client'

export type BakeryApplicationInput = {
  bakeryName: string
  contactName: string
  email: string
  phone: string
  city: string
  notes?: string
}

export type BakeryApplicationReceipt = {
  id: string
  status: 'PENDING'
  createdAt: string
}

export type BakeryApplicationStatus = BakeryApplicationReceipt['status'] | 'CONTACTED' | 'APPROVED' | 'DECLINED'

export type BakeryApplication = {
  id: string
  bakeryName: string
  contactName: string
  email: string
  phone: string
  city: string
  notes: string | null
  status: BakeryApplicationStatus
  createdAt: string
  updatedAt: string
}

export const submitBakeryApplication = (data: BakeryApplicationInput) =>
  send<BakeryApplicationReceipt>('POST', '/bakery-applications', data)

export const listBakeryApplications = () => api<BakeryApplication[]>('/bakery-applications')

export const updateBakeryApplicationStatus = (id: string, status: BakeryApplicationStatus) =>
  send<BakeryApplication>('PATCH', `/bakery-applications/${id}`, { status })
