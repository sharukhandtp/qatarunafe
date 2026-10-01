// Wire types for the QatarUna API (api/v1).
//
// Mirrors the C# DTOs one to one. The backend serialises enums as their names
// (JsonStringEnumConverter) and omits null properties (WhenWritingNull), which is why every
// nullable field here is optional rather than `T | null`.

// ---- Enums -----------------------------------------------------------------

export type UserType = 'PublicUser' | 'GovernmentEmployee' | 'Administrator'
export type NativeStatus = 'NotApplicable' | 'Resident' | 'NativeCitizen'
export type EmployeeLevel = 'None' | 'L1' | 'L2' | 'L3'
export type AccountStatus = 'PendingActivation' | 'Active' | 'Suspended' | 'Deactivated'
export type RequestPriority = 'Low' | 'Normal' | 'High' | 'Critical'
export type ApprovalDecision =
  | 'Approved'
  | 'Rejected'
  | 'ReturnedForInformation'
  | 'Escalated'
  | 'Reassigned'

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'PendingL1Approval'
  | 'PendingL2Approval'
  | 'PendingL3Approval'
  | 'ReturnedForInformation'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed'

export type ServiceCategory =
  | 'NewConnection'
  | 'Disconnection'
  | 'TransferOfOwnership'
  | 'BillingDispute'
  | 'Maintenance'
  | 'Permit'
  | 'Inspection'
  | 'Complaint'
  | 'Subsidy'
  | 'CertificateIssuance'
  | 'Other'

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'LoginSucceeded'
  | 'LoginFailed'
  | 'Logout'
  | 'TokenRefreshed'
  | 'TokenRefreshRejected'
  | 'PasswordChanged'
  | 'MfaEnabled'
  | 'MfaDisabled'
  | 'MfaChallengeIssued'
  | 'AccessDenied'
  | 'RequestSubmitted'
  | 'RequestApproved'
  | 'RequestRejected'
  | 'RequestReturned'
  | 'RequestEscalated'
  | 'RequestAssigned'
  | 'RequestCancelled'
  | 'RequestCompleted'
  | 'PaymentStarted'
  | 'PaymentSucceeded'
  | 'PaymentFailed'
  | 'PaymentNotificationRejected'

export type PaymentStatus = 'Pending' | 'Succeeded' | 'Failed'

/** ISO-8601 timestamp with offset, as System.Text.Json writes a DateTimeOffset. */
export type IsoDateTime = string

// ---- Shared ----------------------------------------------------------------

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface PageQuery {
  pageNumber?: number
  pageSize?: number
}

/** RFC 7807 body produced by GlobalExceptionHandler. */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  correlationId?: string
  errors?: Record<string, string[]>
}

// ---- Auth ------------------------------------------------------------------

export interface UserProfile {
  id: string
  email: string
  fullName: string
  nationalId: string
  phoneNumber?: string
  userType: UserType
  nativeStatus: NativeStatus
  ministryId?: string
  ministryCode?: string
  ministryName?: string
  employeeLevel: EmployeeLevel
  jobTitle?: string
  accountStatus: AccountStatus
  lastLoginAt?: IsoDateTime
  mfaEnabled: boolean
}

/** A complete sign-in: what /auth/login, /auth/login/mfa and /auth/refresh return with tokens. */
export interface AuthenticationResponse {
  accessToken: string
  accessTokenExpiresAt: IsoDateTime
  refreshToken: string
  refreshTokenExpiresAt: IsoDateTime
  tokenType: string
  user: UserProfile
}

/** The password was right; a code from the authenticator app is still needed. */
export interface MfaChallenge {
  challengeToken: string
  expiresAt: IsoDateTime
  /** The account must set up an authenticator before it can send a code. */
  enrollmentRequired: boolean
}

/**
 * What /auth/login really returns: the tokens, or only `mfa` (and no tokens) when the
 * account has two-step sign-in.
 */
export type SignInResponse = AuthenticationResponse | { mfa: MfaChallenge }

export interface MfaEnrollment {
  secret: string
  otpAuthUri: string
}

export interface NationalIdentityConfig {
  displayName: string
  authorizationEndpoint: string
  clientId: string
  scope: string
}

export interface NationalIdentitySignInRequest {
  code: string
  redirectUri: string
  codeVerifier?: string
  nonce?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  nationalId: string
  fullName: string
  password: string
  nativeStatus: Extract<NativeStatus, 'Resident' | 'NativeCitizen'>
  phoneNumber?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---- Ministries ------------------------------------------------------------

export interface Ministry {
  id: string
  code: string
  name: string
  nameArabic?: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  isActive: boolean
  activeServiceCount: number
  employeeCount: number
}

export interface MinistriesQuery extends PageQuery {
  includeInactive?: boolean
  search?: string
}

export interface CreateMinistryRequest {
  code: string
  name: string
  nameArabic?: string
  description?: string
  contactEmail?: string
  contactPhone?: string
}

export type UpdateMinistryRequest = Omit<CreateMinistryRequest, 'code'>

export interface ServiceDefinition {
  id: string
  ministryId: string
  ministryCode: string
  code: string
  name: string
  description?: string
  nameArabic?: string
  descriptionArabic?: string
  category: ServiceCategory
  requiredApprovalLevel: EmployeeLevel
  nativeCitizensOnly: boolean
  slaHours: number
  /** In QAR; 0 for a free service. */
  fee: number
  isActive: boolean
}

export interface CreateServiceRequest {
  code: string
  name: string
  description?: string
  nameArabic?: string
  descriptionArabic?: string
  category: ServiceCategory
  requiredApprovalLevel: EmployeeLevel
  nativeCitizensOnly: boolean
  slaHours: number
  fee: number
}

export type UpdateServiceRequest = Omit<CreateServiceRequest, 'code'>

// ---- Public services (citizen side) ----------------------------------------

export interface ServiceCatalogItem {
  id: string
  ministryId: string
  ministryCode: string
  ministryName: string
  ministryNameArabic?: string
  code: string
  name: string
  description?: string
  nameArabic?: string
  descriptionArabic?: string
  category: ServiceCategory
  requiredApprovalLevel: EmployeeLevel
  nativeCitizensOnly: boolean
  slaHours: number
  /** In QAR; 0 for a free service. */
  fee: number
}

export interface CatalogueQuery extends PageQuery {
  ministryCode?: string
  category?: ServiceCategory
  search?: string
}

export interface CitizenRequestSummary {
  id: string
  referenceNumber: string
  ministryCode: string
  ministryName: string
  serviceName: string
  title: string
  category: ServiceCategory
  priority: RequestPriority
  status: RequestStatus
  submittedAt?: IsoDateTime
  dueAt?: IsoDateTime
  decidedAt?: IsoDateTime
}

export interface RequestAttachment {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: IsoDateTime
}

export interface CitizenRequestDetail {
  id: string
  referenceNumber: string
  ministryId: string
  ministryCode: string
  ministryName: string
  serviceDefinitionId: string
  serviceName: string
  title: string
  description: string
  category: ServiceCategory
  priority: RequestPriority
  status: RequestStatus
  isEditable: boolean
  submittedAt?: IsoDateTime
  dueAt?: IsoDateTime
  decidedAt?: IsoDateTime
  completedAt?: IsoDateTime
  decisionNotes?: string
  /** 0 when the service is free. */
  feeAmount: number
  feePaidAt?: IsoDateTime
  attachments: RequestAttachment[]
}

export interface MyRequestsQuery extends PageQuery {
  status?: RequestStatus
  ministryCode?: string
  openOnly?: boolean
}

export interface CreateCitizenRequest {
  serviceDefinitionId: string
  title: string
  description: string
  priority: RequestPriority
  saveAsDraft: boolean
}

export interface UpdateCitizenRequest {
  title: string
  description: string
  priority: RequestPriority
}

export interface RequestCreatedResponse {
  id: string
  referenceNumber: string
  status: RequestStatus
  dueAt?: IsoDateTime
  feeAmount: number
  /** The request stays a draft until this fee is paid. */
  feeOutstanding: boolean
}

// ---- Payments and certificates -----------------------------------------------

export interface Payment {
  id: string
  requestId: string
  amount: number
  currency: string
  status: PaymentStatus
  provider: string
  /** Where to send the applicant to pay. Relative (an API path) for the development simulator. */
  checkoutUrl?: string
  createdAt: IsoDateTime
  completedAt?: IsoDateTime
  failureReason?: string
}

export interface CertificateVerification {
  number: string
  referenceNumber: string
  serviceName: string
  ministryName: string
  holderName: string
  issuedAt: IsoDateTime
}

// ---- Notifications -------------------------------------------------------------

export interface Notification {
  id: string
  /** e.g. "request.approved", "sla.breached", "payment.completed". */
  type: string
  title: string
  body: string
  requestId?: string
  referenceNumber?: string
  createdAt: IsoDateTime
  readAt?: IsoDateTime
}

export interface NotificationsQuery extends PageQuery {
  unreadOnly?: boolean
}

export interface NotificationPreferences {
  preferredLanguage: string
  notifyByEmail: boolean
  notifyBySms: boolean
  hasPhoneNumber: boolean
}

export type UpdateNotificationPreferences = Omit<NotificationPreferences, 'hasPhoneNumber'>

// ---- Reports -------------------------------------------------------------------

export interface ReportRangeQuery {
  /** Inclusive; defaults to 30 days before `to`. */
  from?: IsoDateTime
  /** Exclusive; defaults to now. */
  to?: IsoDateTime
}

export interface DepartmentReportQuery extends ReportRangeQuery {
  /** Required for administrators; ignored for ministry staff. */
  ministryId?: string
}

export interface StageTiming {
  stage: EmployeeLevel
  decisions: number
  averageHours: number
}

export interface DepartmentPerformance {
  ministryId: string
  ministryCode: string
  ministryName: string
  from: IsoDateTime
  to: IsoDateTime
  submitted: number
  approved: number
  rejected: number
  cancelled: number
  completed: number
  awaitingDecision: number
  returnedToApplicant: number
  overdueNow: number
  decided: number
  decidedLate: number
  /** 0..1, absent when nothing was decided. */
  onTimeRate?: number
  averageDecisionHours?: number
  stageTimings: StageTiming[]
}

export interface OfficerPerformance {
  userId: string
  fullName: string
  level: EmployeeLevel
  decisions: number
  approved: number
  rejected: number
  returned: number
  escalated: number
  averageHoursToDecide?: number
}

export interface MinistryOverview {
  ministryId: string
  ministryCode: string
  ministryName: string
  submitted: number
  awaitingDecision: number
  overdueNow: number
  onTimeRate?: number
  averageDecisionHours?: number
  feesCollected: number
}

export interface PortalOverview {
  from: IsoDateTime
  to: IsoDateTime
  submitted: number
  awaitingDecision: number
  overdueNow: number
  onTimeRate?: number
  feesCollected: number
  ministries: MinistryOverview[]
}

// ---- Department workflow (ministry side) -----------------------------------

export interface DepartmentRequestSummary {
  id: string
  referenceNumber: string
  serviceCode: string
  serviceName: string
  title: string
  category: ServiceCategory
  priority: RequestPriority
  status: RequestStatus
  currentStage: EmployeeLevel
  requiredApprovalLevel: EmployeeLevel
  applicantName: string
  assignedToUserId?: string
  assignedToName?: string
  submittedAt?: IsoDateTime
  dueAt?: IsoDateTime
  isOverdue: boolean
}

export interface ApprovalTrailEntry {
  sequenceNumber: number
  stage: EmployeeLevel
  decision: ApprovalDecision
  actorUserId: string
  actorName: string
  comments?: string
  actedAt: IsoDateTime
}

export interface DepartmentAttachment {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedByUserId: string
  uploadedAt: IsoDateTime
}

export interface DepartmentRequestDetail {
  id: string
  referenceNumber: string
  ministryId: string
  ministryCode: string
  serviceDefinitionId: string
  serviceCode: string
  serviceName: string
  title: string
  description: string
  category: ServiceCategory
  priority: RequestPriority
  status: RequestStatus
  currentStage: EmployeeLevel
  requiredApprovalLevel: EmployeeLevel
  applicantUserId: string
  applicantName: string
  applicantNationalId: string
  applicantNativeStatus: NativeStatus
  assignedToUserId?: string
  assignedToName?: string
  submittedAt?: IsoDateTime
  dueAt?: IsoDateTime
  decidedAt?: IsoDateTime
  completedAt?: IsoDateTime
  decisionNotes?: string
  isOverdue: boolean
  approvalTrail: ApprovalTrailEntry[]
  attachments: DepartmentAttachment[]
}

export interface DepartmentQueueQuery extends PageQuery {
  status?: RequestStatus
  stage?: EmployeeLevel
  priority?: RequestPriority
  category?: ServiceCategory
  myLevelOnly?: boolean
  assignedToMeOnly?: boolean
  unassignedOnly?: boolean
  overdueOnly?: boolean
  search?: string
}

export interface WorkflowTransition {
  id: string
  referenceNumber: string
  status: RequestStatus
  currentStage: EmployeeLevel
  requiredApprovalLevel: EmployeeLevel
  decidedAt?: IsoDateTime
}

export interface DepartmentWorkload {
  ministryId: string
  ministryCode: string
  awaitingL1: number
  awaitingL2: number
  awaitingL3: number
  returnedForInformation: number
  overdue: number
  unassignedAtMyLevel: number
  assignedToMe: number
  decidedLast30Days: number
}

// ---- Administration --------------------------------------------------------

export interface UsersQuery extends PageQuery {
  userType?: UserType
  ministryId?: string
  employeeLevel?: EmployeeLevel
  accountStatus?: AccountStatus
  nativeStatus?: NativeStatus
  search?: string
}

export interface CreateEmployeeRequest {
  email: string
  nationalId: string
  fullName: string
  initialPassword: string
  ministryId: string
  employeeLevel: EmployeeLevel
  jobTitle?: string
  phoneNumber?: string
}

export interface AuditLogEntry {
  id: string
  occurredAt: IsoDateTime
  action: AuditAction
  entityName: string
  entityId?: string
  actorUserId?: string
  actorName?: string
  actorUserType?: UserType
  actorEmployeeLevel?: EmployeeLevel
  ministryId?: string
  succeeded: boolean
  failureReason?: string
  affectedColumns?: string
  ipAddress?: string
  httpMethod?: string
  requestPath?: string
  correlationId?: string
}

export interface AuditLogsQuery extends PageQuery {
  action?: AuditAction
  actorUserId?: string
  ministryId?: string
  entityName?: string
  entityId?: string
  correlationId?: string
  failuresOnly?: boolean
  from?: IsoDateTime
  to?: IsoDateTime
}
