import { useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { UserType } from './api/types'
import { useCurrentUser } from './auth/AuthContext'
import { GuestOnly, RequireAuth } from './auth/guards'
import { homePath } from './auth/roles'
import { AppShell } from './components/layout/AppShell'
import { PageLoader } from './components/ui/Feedback'
import { useI18n } from './i18n'

type PropsOf<C> = C extends ComponentType<infer P> ? P : never

/** Route-level code splitting for named page exports. */
function page<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType<PropsOf<M[K]>> }))
}

const suspended = (element: ReactNode) => <Suspense fallback={<PageLoader />}>{element}</Suspense>

const AdminDashboard = page(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard')
const CreateEmployeePage = page(() => import('./pages/admin/CreateEmployeePage'), 'CreateEmployeePage')
const MinistriesPage = page(() => import('./pages/admin/MinistriesPage'), 'MinistriesPage')
const MinistryDetailPage = page(() => import('./pages/admin/MinistryDetailPage'), 'MinistryDetailPage')
const UserDetailPage = page(() => import('./pages/admin/UserDetailPage'), 'UserDetailPage')
const UsersPage = page(() => import('./pages/admin/UsersPage'), 'UsersPage')
const LoginPage = page(() => import('./pages/auth/LoginPage'), 'LoginPage')
const NationalIdentityCallbackPage = page(
  () => import('./pages/auth/NationalIdentityCallbackPage'),
  'NationalIdentityCallbackPage',
)
const VerifyCertificatePage = page(() => import('./pages/public/VerifyCertificatePage'), 'VerifyCertificatePage')
const NotificationsPage = page(() => import('./pages/shared/NotificationsPage'), 'NotificationsPage')
const DepartmentReportPage = page(() => import('./pages/reports/ReportPages'), 'DepartmentReportPage')
const PortalOverviewPage = page(() => import('./pages/reports/ReportPages'), 'PortalOverviewPage')
const RegisterPage = page(() => import('./pages/auth/RegisterPage'), 'RegisterPage')
const CataloguePage = page(() => import('./pages/citizen/CataloguePage'), 'CataloguePage')
const CitizenDashboard = page(() => import('./pages/citizen/CitizenDashboard'), 'CitizenDashboard')
const MyRequestDetailPage = page(() => import('./pages/citizen/MyRequestDetailPage'), 'MyRequestDetailPage')
const MyRequestsPage = page(() => import('./pages/citizen/MyRequestsPage'), 'MyRequestsPage')
const NewRequestPage = page(() => import('./pages/citizen/NewRequestPage'), 'NewRequestPage')
const CaseDetailPage = page(() => import('./pages/department/CaseDetailPage'), 'CaseDetailPage')
const DepartmentDashboard = page(() => import('./pages/department/DepartmentDashboard'), 'DepartmentDashboard')
const QueuePage = page(() => import('./pages/department/QueuePage'), 'QueuePage')
const AuditLogPage = page(() => import('./pages/shared/AuditLogPage'), 'AuditLogPage')
const ProfilePage = page(() => import('./pages/shared/ProfilePage'), 'ProfilePage')
const ForbiddenPage = page(() => import('./pages/shared/StatusPages'), 'ForbiddenPage')
const NotFoundPage = page(() => import('./pages/shared/StatusPages'), 'NotFoundPage')

const CITIZEN: UserType[] = ['PublicUser']
const EMPLOYEE: UserType[] = ['GovernmentEmployee']
const STAFF_OR_ADMIN: UserType[] = ['GovernmentEmployee', 'Administrator']
const ADMIN: UserType[] = ['Administrator']

/** Route-level role gate. The shell above it has already ensured someone is signed in. */
const only = (allow: UserType[], element: ReactNode) => <RequireAuth allow={allow}>{element}</RequireAuth>

function HomeRedirect() {
  return <Navigate to={homePath(useCurrentUser())} replace />
}

const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly>{suspended(<LoginPage />)}</GuestOnly> },
  { path: '/register', element: <GuestOnly>{suspended(<RegisterPage />)}</GuestOnly> },
  // Where the national identity provider returns to. Not GuestOnly: it signs the user in itself.
  { path: '/auth/callback', element: suspended(<NationalIdentityCallbackPage />) },
  // Public certificate check - the target of the QR code, for people who are not portal users.
  { path: '/verify', element: suspended(<VerifyCertificatePage />) },
  { path: '/verify/:code', element: suspended(<VerifyCertificatePage />) },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },

      // Citizens
      { path: 'dashboard', element: only(CITIZEN, <CitizenDashboard />) },
      { path: 'services', element: <CataloguePage /> },
      { path: 'requests', element: only(CITIZEN, <MyRequestsPage />) },
      { path: 'requests/new', element: only(CITIZEN, <NewRequestPage />) },
      { path: 'requests/:requestId', element: only(CITIZEN, <MyRequestDetailPage />) },

      // Ministry staff (administrators get read-only oversight of the queue)
      { path: 'department', element: only(EMPLOYEE, <DepartmentDashboard />) },
      { path: 'department/queue', element: only(STAFF_OR_ADMIN, <QueuePage />) },
      { path: 'department/cases/:requestId', element: only(STAFF_OR_ADMIN, <CaseDetailPage />) },
      { path: 'directory', element: only(EMPLOYEE, <UsersPage mode="directory" />) },
      { path: 'audit', element: only(STAFF_OR_ADMIN, <AuditLogPage />) },
      { path: 'reports', element: only(EMPLOYEE, <DepartmentReportPage />) },

      // Administration
      { path: 'admin', element: only(ADMIN, <AdminDashboard />) },
      { path: 'admin/ministries', element: only(ADMIN, <MinistriesPage />) },
      { path: 'admin/ministries/:ministryId', element: only(ADMIN, <MinistryDetailPage />) },
      { path: 'admin/users', element: only(ADMIN, <UsersPage mode="admin" />) },
      { path: 'admin/users/new', element: only(ADMIN, <CreateEmployeePage />) },
      { path: 'admin/users/:userId', element: only(ADMIN, <UserDetailPage />) },
      { path: 'admin/reports', element: only(ADMIN, <PortalOverviewPage />) },
      { path: 'admin/reports/:ministryId', element: only(ADMIN, <DepartmentReportPage />) },

      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  // Remounting the routed tree on a language switch re-renders every string, including labels
  // read outside React; auth, toasts and the query cache live above it and are kept.
  const { lang } = useI18n()
  const queryClient = useQueryClient()
  const previous = useRef(lang)

  // Server messages follow Accept-Language, so cached responses are refetched in the new language.
  useEffect(() => {
    if (previous.current === lang) return
    previous.current = lang
    void queryClient.invalidateQueries()
  }, [lang, queryClient])

  return <RouterProvider key={lang} router={router} />
}
