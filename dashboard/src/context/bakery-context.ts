import { createContext, useContext } from 'react'
import type { BakerySettings, Me } from '../types/api'

export interface BakeryContextValue {
  me: Me
  bakery: BakerySettings
  isOwner: boolean
  // Counts shown in the sidebar.
  newOrders: number
  stockAlerts: number
  switchBakery: (bakeryId: string) => void
  refreshBakery: () => void
  refreshCounts: () => void
}

export const BakeryContext = createContext<BakeryContextValue | null>(null)

// The signed in staff member and the bakery they're working on. Only usable inside BakeryProvider.
export function useBakery() {
  const value = useContext(BakeryContext)
  if (!value) throw new Error('useBakery must be used inside BakeryProvider')
  return value
}
