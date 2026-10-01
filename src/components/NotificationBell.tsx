import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { notificationsApi } from '../api/endpoints'
import { keys } from '../hooks/queries'
import { t, tn } from '../i18n'

/**
 * Unread badge in the header. Polled once a minute while the tab is open; the endpoint is
 * outside /auth/*, so it does not count against the sign-in rate limit.
 */
export function NotificationBell() {
  const unread = useQuery({
    queryKey: keys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
    select: (r) => r.unread,
  })
  const count = unread.data ?? 0

  return (
    <Link
      to="/notifications"
      className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      title={t('notifications.title')}
      aria-label={count ? tn('notifications.unreadLabel', count) : t('notifications.title')}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 end-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
