export type UserRole = "SUPER_ADMIN" | "ADMIN";
export type PdfStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type PdfRegenerationScope = "missing" | "all";
export type CertificateStatus = "PENDING" | "ISSUED" | "REJECTED" | "REVOKED";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationReadStatus = "all" | "read" | "unread";
export type TemplateFieldType = "TEXT" | "NUMBER" | "DATE" | "EMAIL";
export type CertificateAuditAction = "CREATED" | "UPDATED" | "ISSUED" | "REJECTED" | "REVOKED" | "DELETED";
export type CertificateAuditRecordStatus = "ISSUED" | "REJECTED" | "DELETED" | "REVOKED";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type CsvParseErrorDetails = {
  reason: "INCONSISTENT_COLUMNS";
  line: number;
  expectedColumns: number;
  actualColumns: number;
};

export type AuthUserDto = {
  id: string;
  email: string;
  name: string | null;
  logoUrl: string | null;
  role: UserRole;
};

export type AuthResultDto = {
  user: AuthUserDto;
  accessToken: string;
};

export type TemplateDto = {
  id: string;
  name: string;
  category: string | null;
  batchCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TemplateFieldDto = {
  id: string;
  name: string;
  type: TemplateFieldType;
  required: boolean;
};

export type DesignDto = {
  id: string;
  templateId: string;
  layoutJson: Record<string, unknown>;
};

export type DesignImageUploadDto = {
  imageUrl: string;
};

export type BatchDto = {
  id: string;
  name: string;
  slug: string | null;
  templateId: string;
  templateName: string;
  totalCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginationDto = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TemplateListDto = {
  items: TemplateDto[];
  pagination: PaginationDto;
};

export type BatchListDto = {
  items: BatchDto[];
  pagination: PaginationDto;
};

export type CertificateDto = {
  id: string;
  batchId: string;
  data: Record<string, unknown>;
  status: CertificateStatus;
  issuedAt: string | null;
  qrCode: string | null;
  verificationCode: string | null;
  version: number;
  parentId: string | null;
  pdfStatus: PdfStatus | null;
  pdfUrl: string | null;
};

export type NotificationDto = {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
};

export type NotificationListDto = {
  items: NotificationDto[];
  pagination: PaginationDto;
  unreadCount: number;
};

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  logoUrl: string | null;
  role: UserRole;
  isActive: boolean;
};

export type UserListDto = {
  items: UserDto[];
  pagination: PaginationDto;
};

export type SessionDto = {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
  };
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type SessionListDto = {
  items: SessionDto[];
  pagination: PaginationDto;
};

export type CsvValidationErrorDto = {
  code: string;
  message: string;
  details?: unknown;
};

export type CsvValidationRowDto = {
  row: number;
  data: Record<string, string>;
  valid: boolean;
  duplicate: boolean;
  error?: CsvValidationErrorDto;
};

export type CsvValidationResultDto = {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
  };
  fields: string[];
  rows: CsvValidationRowDto[];
};

export type BulkIssuanceResultDto = {
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  created: CertificateDto[];
  failed: Array<{
    row: number;
    data: Record<string, string>;
    error: CsvValidationErrorDto;
  }>;
};

export type PdfRegenerationResultDto = {
  summary: {
    totalIssued: number;
    queued: number;
    skipped: number;
    missingFiles: number;
  };
};

export type VerificationResultDto = {
  certificate: CertificateDto;
  latestCertificate: CertificateDto | null;
  template: TemplateDto;
  issuer: UserDto;
  status: CertificateStatus;
};

export type AuditActorDto = {
  id: string;
  name: string | null;
  email: string;
};

export type CertificateAuditListItemDto = {
  id: string;
  recordStatus: CertificateAuditRecordStatus;
  currentStatus: CertificateStatus;
  recipientLabel: string;
  batch: {
    id: string;
    name: string;
  };
  template: {
    id: string;
    name: string;
    category: string | null;
  };
  issuer: AuditActorDto | null;
  createdBy: AuditActorDto | null;
  lastAction: {
    action: CertificateAuditAction | null;
    at: string | null;
    actor: AuditActorDto | null;
  };
  issuedAt: string | null;
  deletedAt: string | null;
  verificationCode: string | null;
};

export type CertificateAuditListDto = {
  items: CertificateAuditListItemDto[];
  pagination: PaginationDto;
};

export type CertificateAuditHistoryItemDto = {
  id: string;
  action: CertificateAuditAction;
  at: string;
  actor: AuditActorDto | null;
  snapshot: Record<string, unknown>;
};

export type CertificateAuditDetailDto = {
  id: string;
  batchId: string;
  recordStatus: CertificateAuditRecordStatus;
  currentStatus: CertificateStatus;
  data: Record<string, unknown>;
  issuedAt: string | null;
  deletedAt: string | null;
  qrCode: string | null;
  verificationCode: string | null;
  recipientLabel: string;
  batch: {
    id: string;
    name: string;
    createdBy: AuditActorDto | null;
  };
  template: {
    id: string;
    name: string;
    category: string | null;
    issuer: AuditActorDto | null;
  };
  history: CertificateAuditHistoryItemDto[];
};

export type LearnerCertificateDto = {
  id: string;
  templateName: string;
  batchName: string;
  issuedAt: string;
  pdfUrl: string | null;
  pdfReady: boolean;
  qrCode: string | null;
  data: Record<string, unknown>;
};

export type LearnerCertificatesDto = { certificates: LearnerCertificateDto[] };

export type IntegrationClientType = "LMS";
export type IntegrationEventStatus = "RECEIVED" | "SUCCESS" | "FAILED" | "DUPLICATE";

export interface IntegrationClientDto {
  id: string;
  name: string;
  type: IntegrationClientType;
  apiKeyLast4: string;
  active: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationClientWithKeyDto {
  client: IntegrationClientDto;
  apiKey: string;
}

export interface ExternalBatchMappingDto {
  id: string;
  clientId: string;
  externalCourseId: string;
  externalCourseName: string;
  externalCourseType: string | null;
  externalGroupId: string | null;
  externalGroupName: string | null;
  batchId: string;
  batchName?: string;
  templateName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationEventDto {
  id: string;
  clientId: string;
  clientName?: string;
  mappingId: string | null;
  batchId: string | null;
  externalEventId: string;
  eventType: string;
  learnerName: string;
  learnerEmail: string;
  externalLearnerId: string;
  externalCourseId: string;
  externalGroupId: string | null;
  payload: Record<string, unknown>;
  status: IntegrationEventStatus;
  errorMessage: string | null;
  certificateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationClientListDto {
  items: IntegrationClientDto[];
  pagination: PaginationDto;
}

export interface ExternalBatchMappingListDto {
  items: ExternalBatchMappingDto[];
  pagination: PaginationDto;
}

export interface IntegrationEventListDto {
  items: IntegrationEventDto[];
  pagination: PaginationDto;
}

