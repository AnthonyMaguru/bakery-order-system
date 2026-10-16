import type { BakerySettings, BlockedDate, CalendarDay, Me, Member, MemberRole } from '../types/api'
import { api, query, send } from './client'

export const getMe = () => api<Me>('/users/me')

export const getSettings = (bakeryId: string) => api<BakerySettings>(`/bakeries/${bakeryId}/settings`)

export type SettingsUpdate = Partial<Omit<BakerySettings, 'id' | 'slug' | 'country' | 'currency' | 'timezone'>>

export const updateSettings = (bakeryId: string, data: SettingsUpdate) =>
  send<BakerySettings>('PATCH', `/bakeries/${bakeryId}`, data)

export const getAvailability = (bakeryId: string, from: string, days: number) =>
  api<CalendarDay[]>(`/bakeries/${bakeryId}/availability${query({ from, days })}`)

export const listBlockedDates = (bakeryId: string) => api<BlockedDate[]>(`/bakeries/${bakeryId}/blocked-dates`)

export const blockDate = (bakeryId: string, date: string, reason?: string) =>
  send<BlockedDate>('POST', `/bakeries/${bakeryId}/blocked-dates`, { date, reason: reason || undefined })

export const unblockDate = (bakeryId: string, blockedDateId: string) =>
  send<null>('DELETE', `/bakeries/${bakeryId}/blocked-dates/${blockedDateId}`)

export const listMembers = (bakeryId: string) => api<Member[]>(`/bakeries/${bakeryId}/members`)

export const addMember = (bakeryId: string, email: string, role: MemberRole) =>
  send<Member>('POST', `/bakeries/${bakeryId}/members`, { email, role })

export const removeMember = (bakeryId: string, memberId: string) =>
  send<null>('DELETE', `/bakeries/${bakeryId}/members/${memberId}`)
