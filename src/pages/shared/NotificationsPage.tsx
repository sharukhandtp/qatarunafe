import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Bell, CheckCheck, Settings } from 'lucide-react'
import { useNavigate } from 'react-router'
import { errorMessage } from '../../api/client'
import { notificationsApi } from '../../api/endpoints'
import type { Notification } from '../../api/types'
import { useCurrentUser } from '../../auth/AuthContext'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { Checkbox } from '../../components/ui/Form'
import { PageHeader, Pagination } from '../../components/ui/Layout'
import { useToast } from '../../components/ui/Toast'
import { keys } from '../../hooks/queries'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { t, tn } from '../../i18n'
import { formatDateTime, formatRelative } from '../../lib/format'
import { notificationLink } from '../../lib/notifications'

const FILTERS = ['unread'] as const

export function NotificationsPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { filters, setFilters, page, setPage } = useUrlFilters(FILTERS)
  const unreadOnly = filters.unread === '1'

  const query = { pageNumber: page, pageSize: 20, unreadOnly }
  const list = useQuery({
    queryKey: keys.notificationList(query),
    queryFn: () => notificationsApi.list(query),
    placeholderData: keepPreviousData,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.notifications })

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh })

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: ({ marked }) => {
      toast.success(tn('notifications.markedRead', marked))
      refresh()
    },
    onError: (e) => toast.error(t('notifications.markFailed'), errorMessage(e)),
  })

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id)
    const to = notificationLink(user, n)
    if (to) navigate(to)
  }

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        actions={
          <>
            <ButtonLink to="/profile#notifications" variant="ghost" icon={Settings}>
              {t('notifications.preferences')}
            </ButtonLink>
            <Button variant="secondary" icon={CheckCheck} loading={markAll.isPending} onClick={() => markAll.mutate()}>
              {t('notifications.markAllRead')}
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Checkbox
          label={t('notifications.unreadOnly')}
          checked={unreadOnly}
          onChange={(e) => setFilters({ unread: e.target.checked ? '1' : '' })}
        />
      </div>

      <Card>
        {list.isLoading ? (
          <PageLoader />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data?.items.length ? (
          <EmptyState
            icon={Bell}
            title={t(unreadOnly ? 'notifications.noneUnread' : 'notifications.none')}
            description={t('notifications.noneHint')}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {list.data.items.map((n) => {
                const linked = Boolean(notificationLink(user, n))
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={clsx(
                        'flex w-full gap-3 px-5 py-4 text-start',
                        linked || !n.readAt ? 'hover:bg-slate-50' : 'cursor-default',
                        !n.readAt && 'bg-brand-50/40',
                      )}
                    >
                      <span
                        className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand-600')}
                        aria-label={n.readAt ? undefined : t('notifications.unread')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className={clsx('text-sm text-slate-900', !n.readAt && 'font-semibold')}>{n.title}</span>
                          <span className="text-xs text-slate-500" title={formatDateTime(n.createdAt)}>
                            {formatRelative(n.createdAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm whitespace-pre-line text-slate-600">{n.body}</span>
                        {n.referenceNumber && (
                          <span className="mt-1 block font-mono text-xs text-slate-500">{n.referenceNumber}</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <Pagination page={list.data} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
