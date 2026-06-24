import { http, normalizeApiError } from "@/api/client";
import type {
  CertificateAuditDetailDto,
  CertificateAuditListDto,
  AuthResultDto,
  AuthUserDto,
  BatchDto,
  BatchListDto,
  BulkIssuanceResultDto,
  CertificateDto,
  CsvValidationResultDto,
  DesignDto,
  DesignImageUploadDto,
  LearnerCertificatesDto,
  NotificationDto,
  NotificationListDto,
  NotificationReadStatus,
  NotificationType,
  PdfRegenerationResultDto,
  PdfRegenerationScope,
  SessionListDto,
  TemplateDto,
  TemplateFieldDto,
  TemplateListDto,
  UserDto,
  UserListDto,
  VerificationResultDto,
  IntegrationClientDto,
  IntegrationClientWithKeyDto,
  ExternalBatchMappingDto,
  IntegrationEventDto,
  IntegrationClientListDto,
  ExternalBatchMappingListDto,
  IntegrationEventListDto,
} from "@/api/types";

type BatchListFilters = {
  category?: string;
  templateId?: string;
};

export const api = {
  auth: {
    async login(input: { email: string; password: string }) {
      try {
        const response = await http.post<AuthResultDto>("/auth/login", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async refresh() {
      try {
        const response = await http.post<AuthResultDto>("/auth/refresh");
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async logout() {
      try {
        await http.post("/auth/logout");
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateMe(input: { name?: string; password?: string }) {
      try {
        const response = await http.patch<AuthUserDto>("/auth/me", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async uploadLogo(file: File) {
      try {
        const form = new FormData();
        form.append("logo", file);
        const response = await http.post<AuthUserDto>("/auth/me/logo", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async forgotPassword(email: string) {
      try {
        await http.post("/auth/forgot-password", { email });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async resetPassword(token: string, password: string) {
      try {
        await http.post("/auth/reset-password", { token, password });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  templates: {
    async list(page = 1, limit = 10) {
      try {
        const response = await http.get<TemplateListDto>("/templates", {
          params: { page, limit },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async create(input: { name: string; category: string | null }) {
      try {
        const response = await http.post<TemplateDto>("/templates", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async update(id: string, input: { name?: string; category?: string | null }) {
      try {
        const response = await http.patch<TemplateDto>(`/templates/${id}`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async duplicate(id: string, input: { name?: string } = {}) {
      try {
        const response = await http.post<TemplateDto>(`/templates/${id}/duplicate`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async remove(id: string) {
      try {
        await http.delete(`/templates/${id}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async fields(templateId: string) {
      try {
        const response = await http.get<TemplateFieldDto[]>(`/templates/${templateId}/fields`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async createField(templateId: string, input: { name: string; type: string; required: boolean }) {
      try {
        const response = await http.post<TemplateFieldDto>(`/templates/${templateId}/fields`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateField(
      templateId: string,
      fieldId: string,
      input: { name?: string; type?: string; required?: boolean },
    ) {
      try {
        const response = await http.patch<TemplateFieldDto>(
          `/templates/${templateId}/fields/${fieldId}`,
          input,
        );
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteField(templateId: string, fieldId: string) {
      try {
        await http.delete(`/templates/${templateId}/fields/${fieldId}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async getDesign(templateId: string) {
      try {
        const response = await http.get<DesignDto>(`/templates/${templateId}/design`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async saveDesign(templateId: string, layoutJson: Record<string, unknown>) {
      try {
        const response = await http.put<DesignDto>(`/templates/${templateId}/design`, { layoutJson });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async uploadDesignImage(templateId: string, file: File) {
      try {
        const form = new FormData();
        form.append("image", file);
        const response = await http.post<DesignImageUploadDto>(`/templates/${templateId}/design/images`, form);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  batches: {
    async list(page = 1, limit = 10, filters: BatchListFilters = {}) {
      try {
        const response = await http.get<BatchListDto>("/batches", {
          params: {
            page,
            limit,
            category: filters.category,
            templateId: filters.templateId,
          },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async create(input: { name: string; templateId: string }) {
      try {
        const response = await http.post<BatchDto>("/batches", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async update(id: string, input: { name?: string; templateId?: string }) {
      try {
        const response = await http.patch<BatchDto>(`/batches/${id}`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async remove(id: string) {
      try {
        await http.delete(`/batches/${id}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async get(id: string) {
      try {
        const response = await http.get<BatchDto>(`/batches/${id}`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async certificates(batchId: string) {
      try {
        const response = await http.get<CertificateDto[]>(`/batches/${batchId}/certificates`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async validateCsv(batchId: string, file: File) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await http.post<CsvValidationResultDto>(`/batches/${batchId}/upload/csv`, formData);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async issueCsv(batchId: string, csv: string, status: "PENDING" | "ISSUED" | "REJECTED") {
      try {
        const response = await http.post<BulkIssuanceResultDto>(`/batches/${batchId}/issuance/csv`, {
          csv,
          status,
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async issueSingle(
      batchId: string,
      input: { data: Record<string, unknown>; status: "PENDING" | "ISSUED" | "REJECTED" },
    ) {
      try {
        const response = await http.post<CertificateDto>(`/batches/${batchId}/issuance/single`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async issueCertificate(batchId: string, certificateId: string) {
      try {
        const response = await http.patch<CertificateDto>(`/batches/${batchId}/certificates/${certificateId}/issue`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateCertificate(batchId: string, certificateId: string, data: Record<string, unknown>) {
      try {
        const response = await http.patch<CertificateDto>(`/batches/${batchId}/certificates/${certificateId}`, { data });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async rejectCertificate(batchId: string, certificateId: string) {
      try {
        const response = await http.patch<CertificateDto>(`/batches/${batchId}/certificates/${certificateId}/reject`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteCertificate(batchId: string, certificateId: string) {
      try {
        await http.delete(`/batches/${batchId}/certificates/${certificateId}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async correctCertificate(batchId: string, certificateId: string, data: Record<string, unknown>) {
      try {
        const response = await http.post<CertificateDto>(
          `/batches/${batchId}/certificates/${certificateId}/correct`,
          { data },
        );
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async revokeCertificate(batchId: string, certificateId: string) {
      try {
        const response = await http.patch<CertificateDto>(`/batches/${batchId}/certificates/${certificateId}/revoke`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async reprocessCertificate(batchId: string, certificateId: string) {
      try {
        const response = await http.patch<CertificateDto>(`/batches/${batchId}/certificates/${certificateId}/reprocess`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async generatePdf(batchId: string, certificateId: string) {
      try {
        const response = await http.post<CertificateDto>(
          `/batches/${batchId}/certificates/${certificateId}/generate-pdf`,
        );
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async regeneratePdfs(batchId: string, scope: PdfRegenerationScope) {
      try {
        const response = await http.post<PdfRegenerationResultDto>(
          `/batches/${batchId}/certificates/generate-pdfs`,
          { scope },
        );
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async downloadCertificatesZip(batchId: string, batchSlug: string) {
      try {
        const response = await http.get(`/batches/${batchId}/certificates/download-zip`, {
          responseType: "blob",
        });
        const url = URL.createObjectURL(response.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch-${batchSlug}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  notifications: {
    async list(input: { page?: number; limit?: number; status?: NotificationReadStatus; type?: NotificationType } = {}) {
      try {
        const response = await http.get<NotificationListDto>("/notifications", {
          params: {
            page: input.page,
            limit: input.limit,
            status: input.status,
            type: input.type,
          },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async create(input: { message: string; type: NotificationType }) {
      try {
        const response = await http.post<NotificationDto>("/notifications", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async markRead(id: string) {
      try {
        const response = await http.patch<NotificationDto>(`/notifications/${id}/read`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async markUnread(id: string) {
      try {
        const response = await http.patch<NotificationDto>(`/notifications/${id}/unread`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async markAllRead() {
      try {
        const response = await http.patch<{ updated: number }>("/notifications/read-all");
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async remove(id: string) {
      try {
        await http.delete(`/notifications/${id}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  users: {
    async list(page = 1, limit = 10) {
      try {
        const response = await http.get<UserListDto>("/users", {
          params: { page, limit },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async create(input: { name?: string; email: string; password: string }) {
      try {
        const response = await http.post<UserDto>("/users", input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async update(id: string, input: { name?: string; email?: string; password?: string }) {
      try {
        const response = await http.patch<UserDto>(`/users/${id}`, input);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async remove(id: string) {
      try {
        await http.delete(`/users/${id}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async reactivate(id: string) {
      try {
        const response = await http.patch<UserDto>(`/users/${id}/reactivate`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  sessions: {
    async list(page = 1, limit = 10) {
      try {
        const response = await http.get<SessionListDto>("/sessions", {
          params: { page, limit },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async revoke(id: string) {
      try {
        await http.delete(`/sessions/${id}`);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async revokeAll() {
      try {
        const response = await http.delete<{ revoked: number }>("/sessions");
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  credentials: {
    async requestOtp(email: string) {
      try {
        await http.post("/credentials/request-otp", { email });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async verifyOtp(email: string, otp: string) {
      try {
        const response = await http.post<LearnerCertificatesDto>("/credentials/verify-otp", { email, otp });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  verification: {
    async verify(code: string) {
      try {
        const response = await http.get<VerificationResultDto>(`/verify/${code}`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  certificateAudit: {
    async list(page = 1, limit = 10, batchId?: string) {
      try {
        const response = await http.get<CertificateAuditListDto>("/certificate-audit", {
          params: { page, limit, ...(batchId ? { batchId } : {}) },
        });
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async get(id: string) {
      try {
        const response = await http.get<CertificateAuditDetailDto>(`/certificate-audit/${id}`);
        return response.data;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  },
  integrations: {
    clients: {
      async list(page = 1, limit = 10) {
        try {
          const response = await http.get<IntegrationClientListDto>("/integrations/clients", {
            params: { page, limit },
          });
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async create(input: { name: string; type: string }) {
        try {
          const response = await http.post<IntegrationClientWithKeyDto>("/integrations/clients", input);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async update(id: string, input: { name?: string; active?: boolean }) {
        try {
          const response = await http.patch<IntegrationClientDto>(`/integrations/clients/${id}`, input);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async regenerateKey(id: string) {
        try {
          const response = await http.post<IntegrationClientWithKeyDto>(`/integrations/clients/${id}/regenerate-key`);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
    },
    mappings: {
      async list(page = 1, limit = 10, clientId?: string) {
        try {
          const response = await http.get<ExternalBatchMappingListDto>("/integrations/batch-mappings", {
            params: { page, limit, clientId },
          });
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async create(input: {
        clientId: string;
        externalCourseId: string;
        externalCourseName: string;
        externalCourseType?: string | null;
        externalGroupId?: string | null;
        externalGroupName?: string | null;
        batchId: string;
      }) {
        try {
          const response = await http.post<ExternalBatchMappingDto>("/integrations/batch-mappings", input);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async update(id: string, input: { batchId?: string; active?: boolean }) {
        try {
          const response = await http.patch<ExternalBatchMappingDto>(`/integrations/batch-mappings/${id}`, input);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async delete(id: string) {
        try {
          await http.delete(`/integrations/batch-mappings/${id}`);
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
    },
    events: {
      async list(page = 1, limit = 10, filter: { clientId?: string; status?: string; search?: string } = {}) {
        try {
          const response = await http.get<IntegrationEventListDto>("/integrations/events", {
            params: { page, limit, ...filter },
          });
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      async get(id: string) {
        try {
          const response = await http.get<IntegrationEventDto>(`/integrations/events/${id}`);
          return response.data;
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
    },
  },
};
