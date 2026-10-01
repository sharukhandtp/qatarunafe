import clsx from 'clsx'
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  ScrollText,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import type { UserProfile } from '../../api/types'
import { useAuth, useCurrentUser } from '../../auth/AuthContext'
import { atLeast, isAdmin, isEmployee } from '../../auth/roles'
import { t } from '../../i18n'
import { initials } from '../../lib/format'
import { LEVEL, USER_TYPE } from '../../lib/labels'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { NotificationBell } from '../NotificationBell'
import { Badge } from '../ui/Badge'
import { PageLoader } from '../ui/Feedback'
import { BrandLockup } from './Brand'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function navFor(user: UserProfile): { title?: string; items: NavItem[] }[] {
  if (isAdmin(user)) {
    return [
      {
        items: [{ to: '/admin', label: t('nav.overview'), icon: LayoutDashboard, end: true }],
      },
      {
        title: t('nav.administration'),
        items: [
          { to: '/admin/ministries', label: t('nav.ministriesServices'), icon: Building2 },
          { to: '/admin/users', label: t('nav.users'), icon: Users },
          { to: '/audit', label: t('nav.auditTrail'), icon: ScrollText },
        ],
      },
      {
        title: t('nav.oversight'),
        items: [
          { to: '/department/queue', label: t('nav.allCases'), icon: Inbox },
          { to: '/admin/reports', label: t('nav.reports'), icon: BarChart3 },
        ],
      },
    ]
  }

  if (isEmployee(user)) {
    return [
      {
        items: [
          { to: '/department', label: t('nav.overview'), icon: LayoutDashboard, end: true },
          { to: '/department/queue', label: t('nav.caseQueue'), icon: Inbox },
          // Department figures are for supervisors (L2 and up), as the API enforces.
          ...(atLeast(user, 'L2') ? [{ to: '/reports', label: t('nav.reports'), icon: BarChart3 }] : []),
        ],
      },
      {
        title: user.ministryCode ?? t('nav.ministry'),
        items: [
          { to: '/directory', label: t('nav.colleagues'), icon: Users },
          { to: '/audit', label: t('nav.auditTrail'), icon: ScrollText },
        ],
      },
    ]
  }

  return [
    {
      items: [
        { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { to: '/services', label: t('nav.catalogue'), icon: LayoutGrid },
        { to: '/requests', label: t('nav.myRequests'), icon: FileText, end: false },
      ],
    },
  ]
}

function Sidebar({ user, onNavigate }: { user: UserProfile; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {navFor(user).map((group, index) => (
        <div key={group.title ?? index}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={clsx('size-[18px]', isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-500')}
                        aria-hidden
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-auto">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
              isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100',
            )
          }
        >
          <UserCircle className="size-[18px] text-slate-400" aria-hidden />
          {t('nav.profile')}
        </NavLink>
      </div>
    </nav>
  )
}

function IdentityChip({ user }: { user: UserProfile }) {
  const meta = USER_TYPE[user.userType]
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-end sm:block">
        <p className="text-sm leading-tight font-medium text-slate-900">{user.fullName}</p>
        <p className="text-xs text-slate-500">
          {isEmployee(user)
            ? `${user.ministryCode ?? ''} · ${LEVEL[user.employeeLevel]}`
            : isAdmin(user)
              ? t('nav.platformAdmin')
              : user.email}
        </p>
      </div>
      <div
        className="flex size-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white"
        title={`${user.fullName} (${meta.label})`}
      >
        {initials(user.fullName)}
      </div>
    </div>
  )
}

export function AppShell() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen lg:ps-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <BrandLockup />
        </div>
        <Sidebar user={user} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 animate-slide-up flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <BrandLockup />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                aria-label={t('nav.closeMenu')}
              >
                <X className="size-5" />
              </button>
            </div>
            <Sidebar user={user} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="-ms-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label={t('nav.openMenu')}
        >
          <Menu className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          <Badge tone={USER_TYPE[user.userType].tone}>{USER_TYPE[user.userType].label}</Badge>
          {user.ministryName && (
            <span className="hidden items-center gap-1.5 text-sm text-slate-500 md:inline-flex">
              <ClipboardList className="size-4" aria-hidden />
              {user.ministryName}
            </span>
          )}
        </div>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher compact />
          <NotificationBell />
          <IdentityChip user={user} />
          <button
            type="button"
            onClick={signOut}
            className="ms-1 rounded-lg p-2 rtl:-scale-x-100 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title={t('nav.signOut')}
            aria-label={t('nav.signOut')}
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
