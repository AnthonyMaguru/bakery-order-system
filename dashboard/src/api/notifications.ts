import { api, send } from './client'
import type { NotificationsResponse } from '../types/api'

export function getNotifications(limit = 30) {
  return api<NotificationsResponse>(`/notifications?limit=${limit}`)
}

export function markNotificationRead(id: string) {
  return send<{ updated: number }>('PATCH', `/notifications/${encodeURIComponent(id)}/read`)
}

export function markAllNotificationsRead() {
  return send<{ updated: number }>('PATCH', '/notifications/read-all')
}
