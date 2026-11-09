import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import type { Notification } from '../types/api'
import { Icon } from './Icon'

export function NotificationBell() {
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await getNotifications()
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    const interval = window.setInterval(() => {
      void refresh()
    }, 30000)

    const handleFocus = () => {
      void refresh()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refresh])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        )
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch {
        void refresh()
      }
    }

    setOpen(false)

    const link = notification.link
    if (link?.startsWith('/') && !link.startsWith('//')) {
      navigate(link)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update notifications.')
    }
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('en-UG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={21} />
        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="notification-backdrop"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          <section className="notification-panel" aria-label="Notifications">
            <header className="notification-panel-header">
              <div>
                <strong>Notifications</strong>
                <span>{unreadCount} unread</span>
              </div>

              {unreadCount > 0 && (
                <button type="button" onClick={() => void handleMarkAllRead()}>
                  Mark all as read
                </button>
              )}
            </header>

            {error && <p className="notification-error">{error}</p>}

            {loading ? (
              <p className="notification-empty">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="notification-empty">You're all caught up!</p>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notification-item${notification.readAt ? ' is-read' : ' is-unread'}`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span className="notification-dot" />
                    <span className="notification-content">
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                      <time dateTime={notification.createdAt}>
                        {formatDate(notification.createdAt)}
                      </time>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
