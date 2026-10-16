import { createContext, useContext } from 'react'

export interface ToastOptions {
  tone?: 'info' | 'error'
  action?: { label: string; onClick: () => void }
}

export const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null)

// Short feedback after an action, e.g. "Quote sent". Errors use { tone: 'error' }.
export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside ToastProvider')
  return show
}
