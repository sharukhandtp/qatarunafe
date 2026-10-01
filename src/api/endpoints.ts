import { api, downloadFile, type QueryParams } from './client'
import type {
  AccountStatus,
  AuditLogEntry,
  AuditLogsQuery,
  AuthenticationResponse,
  CatalogueQuery,
  CertificateVerification,
  ChangePasswordRequest,
  CitizenRequestDetail,
  CitizenRequestSummary,
  CreateCitizenRequest,
  CreateEmployeeRequest,
  CreateMinistryRequest,
  CreateServiceRequest,
  DepartmentPerformance,
  DepartmentQueueQuery,
  DepartmentReportQuery,
  DepartmentRequestDetail,
  DepartmentRequestSummary,
  DepartmentWorkload,
  EmployeeLevel,
  LoginRequest,
  MfaEnrollment,
  MinistriesQuery,
  Ministry,
  MyRequestsQuery,
  NationalIdentityConfig,
  NationalIdentitySignInRequest,
  Notification,
  NotificationPreferences,
  NotificationsQuery,
  OfficerPerformance,
  PagedResult,
  Payment,
  PortalOverview,
  RegisterRequest,
  ReportRangeQuery,
  RequestAttachment,
  RequestCreatedResponse,
  ServiceCatalogItem,
  ServiceDefinition,
  SignInResponse,
  UpdateNotificationPreferences,
  UpdateCitizenRequest,
  UpdateMinistryRequest,
  UpdateServiceRequest,
  UserProfile,
  UsersQuery,
  WorkflowTransition,
} from './types'

// One function per endpoint, grouped by controller. Nothing here holds state; caching and
// invalidation belong to TanStack Query in the hooks that call these.

const q = (query: object) => query as QueryParams

export const authApi = {
  login: (body: LoginRequest) =>
    api<SignInResponse>('/auth/login', { method: 'POST', body, anonymous: true }),

  /** Second step of a sign-in that answered with `mfa`. */
  loginMfa: (challengeToken: string, code: string) =>
    api<AuthenticationResponse>('/auth/login/mfa', { method: 'POST', body: { challengeToken, code }, anonymous: true }),

  register: (body: RegisterRequest) =>
    api<UserProfile>('/auth/register', { method: 'POST', body, anonymous: true }),

  me: () => api<UserProfile>('/auth/me'),

  logout: (refreshToken: string | null, allSessions = false) =>
    api<{ revokedSessions: number }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken, allSessions },
    }),

  changePassword: (body: ChangePasswordRequest) =>
    api<void>('/auth/change-password', { method: 'POST', body }),

  /**
   * New authenticator secret. With a challenge token it is the enrolment a sign-in demanded
   * (anonymous, finished by loginMfa); without one the signed-in user is turning MFA on.
   */
  startMfaEnrollment: (challengeToken?: string) =>
    challengeToken
      ? api<MfaEnrollment>('/auth/mfa/enrollment', { method: 'POST', body: { challengeToken }, anonymous: true })
      : api<MfaEnrollment>('/auth/mfa/enrollment', { method: 'POST', body: {} }),

  confirmMfaEnrollment: (code: string) =>
    api<void>('/auth/mfa/enrollment/confirm', { method: 'POST', body: { code } }),

  disableMfa: (code: string) => api<void>('/auth/mfa/disable', { method: 'POST', body: { code } }),

  /** 404 when the portal has no national identity provider configured. */
  nationalIdentityConfig: () => api<NationalIdentityConfig>('/auth/national-identity', { anonymous: true }),

  nationalIdentitySignIn: (body: NationalIdentitySignInRequest) =>
    api<AuthenticationResponse>('/auth/national-identity', { method: 'POST', body, anonymous: true }),
}

export const catalogueApi = {
  list: (query: CatalogueQuery) =>
    api<PagedResult<ServiceCatalogItem>>('/public-services/catalogue', { query: q(query) }),
}

const myRequest = (id: string) => `/public-services/requests/${id}`

export const myRequestsApi = {
  list: (query: MyRequestsQuery) =>
    api<PagedResult<CitizenRequestSummary>>('/public-services/requests', { query: q(query) }),

  get: (id: string) => api<CitizenRequestDetail>(myRequest(id)),

  create: (body: CreateCitizenRequest) =>
    api<RequestCreatedResponse>('/public-services/requests', { method: 'POST', body }),

  update: (id: string, body: UpdateCitizenRequest) =>
    api<void>(myRequest(id), { method: 'PUT', body }),

  submit: (id: string) =>
    api<RequestCreatedResponse>(`${myRequest(id)}/submit`, { method: 'POST' }),

  cancel: (id: string) => api<void>(`${myRequest(id)}/cancel`, { method: 'POST' }),

  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api<RequestAttachment>(`${myRequest(id)}/attachments`, { method: 'POST', body: form })
  },

  downloadAttachment: (id: string, attachmentId: string, fileName: string) =>
    downloadFile(`${myRequest(id)}/attachments/${attachmentId}`, fileName),

  deleteAttachment: (id: string, attachmentId: string) =>
    api<void>(`${myRequest(id)}/attachments/${attachmentId}`, { method: 'DELETE' }),

  /** Opens (or returns the still-open) checkout for the request's fee. */
  startPayment: (id: string) => api<Payment>(`${myRequest(id)}/payments`, { method: 'POST' }),

  payments: (id: string) => api<Payment[]>(`${myRequest(id)}/payments`),

  downloadCertificate: (id: string, referenceNumber: string) =>
    downloadFile(`${myRequest(id)}/certificate`, `certificate-${referenceNumber}.pdf`),
}

export const paymentsApi = {
  /** Development only: plays the payment provider for the simulated gateway. */
  simulate: (paymentId: string, succeed: boolean) =>
    api<Payment>(`/payments/${paymentId}/simulate`, { method: 'POST', body: { succeed } }),
}

export const certificatesApi = {
  verify: (code: string) =>
    api<CertificateVerification>(`/certificates/verify/${encodeURIComponent(code)}`, { anonymous: true }),
}

export const notificationsApi = {
  list: (query: NotificationsQuery) =>
    api<PagedResult<Notification>>('/notifications', { query: q(query) }),

  unreadCount: () => api<{ unread: number }>('/notifications/unread-count'),

  markRead: (id: string) => api<void>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => api<{ marked: number }>('/notifications/read-all', { method: 'POST' }),

  preferences: () => api<NotificationPreferences>('/notifications/preferences'),

  updatePreferences: (body: UpdateNotificationPreferences) =>
    api<NotificationPreferences>('/notifications/preferences', { method: 'PUT', body }),
}

export const reportsApi = {
  department: (query: DepartmentReportQuery) =>
    api<DepartmentPerformance>('/reports/department', { query: q(query) }),

  officers: (query: ReportRangeQuery) =>
    api<OfficerPerformance[]>('/reports/department/officers', { query: q(query) }),

  overview: (query: ReportRangeQuery) => api<PortalOverview>('/reports/overview', { query: q(query) }),
}

const caseUrl = (id: string) => `/department/requests/${id}`

export const departmentApi = {
  queue: (query: DepartmentQueueQuery) =>
    api<PagedResult<DepartmentRequestSummary>>('/department/requests', { query: q(query) }),

  workload: () => api<DepartmentWorkload>('/department/requests/workload'),

  get: (id: string) => api<DepartmentRequestDetail>(caseUrl(id)),

  /** Without an assignee the caller takes the case themselves. */
  assign: (id: string, assigneeUserId?: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/assign`, {
      method: 'POST',
      body: { assigneeUserId: assigneeUserId ?? null },
    }),

  approve: (id: string, comments?: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/approve`, {
      method: 'POST',
      body: { comments: comments || null },
    }),

  reject: (id: string, reason: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/reject`, { method: 'POST', body: { reason } }),

  returnForInformation: (id: string, reason: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/return`, { method: 'POST', body: { reason } }),

  escalate: (id: string, reason: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/escalate`, { method: 'POST', body: { reason } }),

  complete: (id: string, closureNotes?: string) =>
    api<WorkflowTransition>(`${caseUrl(id)}/complete`, {
      method: 'POST',
      body: { closureNotes: closureNotes || null },
    }),

  downloadAttachment: (id: string, attachmentId: string, fileName: string) =>
    downloadFile(`${caseUrl(id)}/attachments/${attachmentId}`, fileName),
}

export const ministriesApi = {
  list: (query: MinistriesQuery) =>
    api<PagedResult<Ministry>>('/ministries', { query: q(query) }),

  get: (id: string) => api<Ministry>(`/ministries/${id}`),

  services: (id: string) => api<ServiceDefinition[]>(`/ministries/${id}/services`),

  create: (body: CreateMinistryRequest) =>
    api<{ id: string }>('/ministries', { method: 'POST', body }),

  update: (id: string, body: UpdateMinistryRequest) =>
    api<void>(`/ministries/${id}`, { method: 'PUT', body }),

  setActive: (id: string, isActive: boolean) =>
    api<void>(`/ministries/${id}/active`, { method: 'PUT', body: { isActive } }),

  createService: (ministryId: string, body: CreateServiceRequest) =>
    api<{ id: string }>(`/ministries/${ministryId}/services`, { method: 'POST', body }),

  updateService: (serviceId: string, body: UpdateServiceRequest) =>
    api<void>(`/ministries/services/${serviceId}`, { method: 'PUT', body }),

  setServiceActive: (serviceId: string, isActive: boolean) =>
    api<void>(`/ministries/services/${serviceId}/active`, { method: 'PUT', body: { isActive } }),
}

export const adminApi = {
  users: (query: UsersQuery) =>
    api<PagedResult<UserProfile>>('/admin/users', { query: q(query) }),

  user: (id: string) => api<UserProfile>(`/admin/users/${id}`),

  createEmployee: (body: CreateEmployeeRequest) =>
    api<UserProfile>('/admin/employees', { method: 'POST', body }),

  changeLevel: (userId: string, employeeLevel: EmployeeLevel) =>
    api<void>(`/admin/employees/${userId}/level`, { method: 'PUT', body: { employeeLevel } }),

  transfer: (userId: string, ministryId: string) =>
    api<void>(`/admin/employees/${userId}/ministry`, { method: 'PUT', body: { ministryId } }),

  /** Clears a lost authenticator; the holder sets it up again at their next sign-in. */
  resetMfa: (userId: string) => api<void>(`/admin/users/${userId}/mfa/reset`, { method: 'POST' }),

  setStatus: (userId: string, accountStatus: AccountStatus, reason?: string) =>
    api<void>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: { accountStatus, reason: reason || null },
    }),

  auditLogs: (query: AuditLogsQuery) =>
    api<PagedResult<AuditLogEntry>>('/admin/audit-logs', { query: q(query) }),
}
