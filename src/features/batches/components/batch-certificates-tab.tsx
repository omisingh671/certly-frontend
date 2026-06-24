import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Download,
  FileDown,
  Loader2,
  Pencil,
  PenLine,
  RefreshCcw,
  ShieldOff,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type {
  CertificateDto,
  CertificateStatus,
  PdfRegenerationScope,
  TemplateFieldDto,
} from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";
import { resolvePdfAssetUrl } from "@/lib/asset-url";
import {
  buildCertificateData,
  CertificateDataForm,
  certificateDataToFormValues,
} from "./certificate-data-form";

const EMPTY_CERTIFICATES: CertificateDto[] = [];

type BulkAction = "issue" | "reject" | "revoke" | "reprocess" | "delete";
type PdfBatchConfirm = PdfRegenerationScope | null;

const getRecipientLabel = (
  cert: CertificateDto,
  fields: TemplateFieldDto[],
): string => {
  const nameField = fields.find((f) => /name/i.test(f.name));
  const emailField = fields.find((f) => f.type === "EMAIL");
  const nameVal = nameField
    ? String(cert.data[nameField.name] ?? "").trim()
    : "";
  const emailVal = emailField
    ? String(cert.data[emailField.name] ?? "").trim()
    : "";
  return (
    [nameVal, emailVal].filter(Boolean).join(" · ") ||
    String(Object.values(cert.data)[0] ?? cert.id.slice(0, 12))
  );
};

const statusTone = (s: CertificateStatus) =>
  s === "ISSUED"
    ? "success"
    : s === "REJECTED"
      ? "danger"
      : s === "REVOKED"
        ? "neutral"
        : "warning";

const statusIconStyles: Record<CertificateStatus, string> = {
  ISSUED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  REVOKED: "bg-muted text-text-secondary",
  PENDING: "bg-accent-soft text-warning",
};

const activeStatusIconStyles: Record<CertificateStatus, string> = {
  ISSUED: "bg-success text-primary-foreground shadow-sm ring-1 ring-success/25",
  REJECTED: "bg-danger text-primary-foreground shadow-sm ring-1 ring-danger/25",
  REVOKED: "bg-text-secondary text-primary-foreground shadow-sm ring-1 ring-border/20",
  PENDING: "bg-warning text-primary-foreground shadow-sm ring-1 ring-warning/25",
};

const CertificateStatusIcon = ({
  status,
  active,
}: {
  status: CertificateStatus;
  active: boolean;
}) => {
  const Icon =
    status === "ISSUED"
      ? BadgeCheck
      : status === "REJECTED"
        ? XCircle
        : status === "REVOKED"
          ? ShieldOff
          : Loader2;

  return (
    <span
      className={`inline-flex size-7 items-center justify-center rounded-full ${
        active
          ? activeStatusIconStyles[status]
          : statusIconStyles[status]
      }`}
      title={status}
      aria-label={status}
    >
      <Icon size={14} />
      <span className="sr-only">{status}</span>
    </span>
  );
};

const runBulkAction = <T,>(
  ids: string[],
  action: (id: string) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> => Promise.allSettled(ids.map(action));

export const BatchCertificatesTab = ({
  batchId,
  fields,
}: {
  batchId: string;
  fields: TemplateFieldDto[];
}) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [certPage, setCertPage] = useState(1);
  const [certPageSize, setCertPageSize] = useState(10);
  const [viewId, setViewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    action: BulkAction;
    ids: string[];
  } | null>(null);
  const [pdfBatchConfirm, setPdfBatchConfirm] = useState<PdfBatchConfirm>(null);
  const [certConfirm, setCertConfirm] = useState<{
    action: "reject" | "revoke";
    id: string;
  } | null>(null);

  const certificatesQuery = useQuery({
    queryKey: ["batch-certificates", batchId],
    queryFn: () => api.batches.certificates(batchId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some(
        (c: CertificateDto) =>
          c.pdfStatus === "PENDING" || c.pdfStatus === "PROCESSING",
      )
        ? 3000
        : false;
    },
  });
  useQueryErrorToast(
    certificatesQuery.isError,
    certificatesQuery.error,
    "Failed to load certificates",
  );

  const certificates = certificatesQuery.data ?? EMPTY_CERTIFICATES;

  const filteredCertificates = searchQuery.trim()
    ? certificates.filter((cert) => {
        const q = searchQuery.toLowerCase().trim();
        const label = getRecipientLabel(cert, fields).toLowerCase();
        const code = (cert.verificationCode ?? "").toLowerCase();
        const dataValues = Object.values(cert.data)
          .map(String)
          .join(" ")
          .toLowerCase();
        return label.includes(q) || code.includes(q) || dataValues.includes(q);
      })
    : certificates;

  const totalPages = Math.max(
    Math.ceil(filteredCertificates.length / certPageSize),
    1,
  );
  const pageCerts = filteredCertificates.slice(
    (certPage - 1) * certPageSize,
    certPage * certPageSize,
  );
  const viewCert =
    certificates.find((c) => c.id === viewId) ?? certificates[0] ?? null;

  useEffect(() => {
    if (!certificates.length) {
      setViewId(null);
      return;
    }
    if (!viewId || !certificates.some((c) => c.id === viewId))
      setViewId(certificates[0].id);
  }, [certificates, viewId]);

  const invalidateCerts = () => {
    void queryClient.invalidateQueries({
      queryKey: ["batch-certificates", batchId],
    });
    void queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
  };

  const handleBulkSuccess = (
    label: string,
    results: PromiseSettledResult<unknown>[],
    options: { clearView?: boolean } = {},
  ) => {
    const ok = results.filter((result) => result.status === "fulfilled").length;
    const fail = results.length - ok;

    invalidateCerts();
    setSelectedIds(new Set());

    if (options.clearView) {
      setViewId(null);
    }

    pushToast({
      title: `${label} ${ok}${fail ? `, ${fail} failed` : ""}`,
      tone: fail ? "info" : "success",
    });
  };

  const issueMutation = useMutation({
    mutationFn: (id: string) => api.batches.issueCertificate(batchId, id),
    onSuccess: () => {
      invalidateCerts();
      pushToast({ title: "Certificate issued", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.batches.updateCertificate(batchId, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["batch-certificates", batchId],
      });
      setEditModalOpen(false);
      pushToast({ title: "Certificate updated", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const correctMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.batches.correctCertificate(batchId, id, data),
    onSuccess: () => {
      invalidateCerts();
      setCorrectionModalOpen(false);
      pushToast({
        title: "Certificate corrected — new version issued",
        tone: "success",
      });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.batches.rejectCertificate(batchId, id),
    onSuccess: () => {
      invalidateCerts();
      pushToast({ title: "Certificate rejected", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.batches.revokeCertificate(batchId, id),
    onSuccess: () => {
      invalidateCerts();
      pushToast({ title: "Certificate revoked", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => api.batches.reprocessCertificate(batchId, id),
    onSuccess: async (certificate) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["batch-certificates", batchId],
        }),
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
      ]);
      setViewId(certificate.id);
      pushToast({
        title:
          certificate.version > 1
            ? `Pending version ${certificate.version} created`
            : "Certificate moved back to pending",
        tone: "success",
      });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.batches.deleteCertificate(batchId, id),
    onSuccess: () => {
      invalidateCerts();
      setViewId(null);
      setDeleteConfirmId(null);
      pushToast({ title: "Certificate deleted", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const generatePdfMutation = useMutation({
    mutationFn: (id: string) => api.batches.generatePdf(batchId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["batch-certificates", batchId],
      });
      pushToast({ title: "PDF generation queued", tone: "success" });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const regeneratePdfsMutation = useMutation({
    mutationFn: (scope: PdfRegenerationScope) =>
      api.batches.regeneratePdfs(batchId, scope),
    onSuccess: ({ summary }) => {
      setPdfBatchConfirm(null);
      invalidateCerts();
      pushToast({
        title: `Queued ${summary.queued} PDF${summary.queued === 1 ? "" : "s"} for regeneration`,
        tone: "success",
      });
    },
    onError: (e) => pushToast({ title: e.message, tone: "error" }),
  });

  const bulkIssueMutation = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction(ids, (id) => api.batches.issueCertificate(batchId, id)),
    onSuccess: (results) => handleBulkSuccess("Issued", results),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction(ids, (id) => api.batches.rejectCertificate(batchId, id)),
    onSuccess: (results) => handleBulkSuccess("Rejected", results),
  });

  const bulkRevokeMutation = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction(ids, (id) => api.batches.revokeCertificate(batchId, id)),
    onSuccess: (results) => handleBulkSuccess("Revoked", results),
  });

  const bulkReprocessMutation = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction(ids, (id) => api.batches.reprocessCertificate(batchId, id)),
    onSuccess: (results) => handleBulkSuccess("Reprocessed", results),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction(ids, (id) => api.batches.deleteCertificate(batchId, id)),
    onSuccess: (results) => handleBulkSuccess("Deleted", results, { clearView: true }),
  });

  const bulkPending =
    bulkIssueMutation.isPending ||
    bulkRejectMutation.isPending ||
    bulkRevokeMutation.isPending ||
    bulkReprocessMutation.isPending ||
    bulkDeleteMutation.isPending;
  const pdfBatchPending = regeneratePdfsMutation.isPending;

  // Derived status groups from selection
  const selectedCerts = certificates.filter((c) => selectedIds.has(c.id));
  const pendingIds = selectedCerts
    .filter((c) => c.status === "PENDING")
    .map((c) => c.id);
  const issuedIds = selectedCerts
    .filter((c) => c.status === "ISSUED")
    .map((c) => c.id);
  const rejectedIds = selectedCerts
    .filter((c) => c.status === "REJECTED" && !certificates.some((child) => child.parentId === c.id))
    .map((c) => c.id);
  const revokedIds = selectedCerts
    .filter((c) => c.status === "REVOKED")
    .map((c) => c.id);
  const deletableIds = [...pendingIds, ...rejectedIds, ...revokedIds];

  const handleBulkConfirm = () => {
    if (!bulkConfirm) return;
    const { action, ids } = bulkConfirm;
    setBulkConfirm(null);
    if (action === "issue") bulkIssueMutation.mutate(ids);
    if (action === "reject") bulkRejectMutation.mutate(ids);
    if (action === "revoke") bulkRevokeMutation.mutate(ids);
    if (action === "reprocess") bulkReprocessMutation.mutate(ids);
    if (action === "delete") bulkDeleteMutation.mutate(ids);
  };

  const handleCertConfirm = () => {
    if (!certConfirm) return;
    const { action, id } = certConfirm;
    setCertConfirm(null);
    if (action === "reject") rejectMutation.mutate(id);
    if (action === "revoke") revokeMutation.mutate(id);
  };

  const handlePdfBatchConfirm = () => {
    if (!pdfBatchConfirm) return;
    regeneratePdfsMutation.mutate(pdfBatchConfirm);
  };

  const pageCertIds = pageCerts.map((c) => c.id);
  const allPageSelected =
    pageCertIds.length > 0 && pageCertIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageCertIds.some((id) => selectedIds.has(id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageCertIds.forEach((id) => next.delete(id));
      else pageCertIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleId = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  if (!certificates.length && !certificatesQuery.isLoading) {
    return (
      <EmptyState
        title="No certificates in this batch"
        description="Use the issuance tab to upload CSV data or create single certificates manually."
      />
    );
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Left — certificate list */}
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="rounded"
              checked={allPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = somePageSelected && !allPageSelected;
              }}
              onChange={toggleSelectAllPage}
            />
            <div>
              <p className="font-display text-2xl font-semibold text-text-primary">
                Certificate list
              </p>
              <p className="text-sm text-text-secondary">
                Click to inspect · check to bulk-action.
              </p>
            </div>
          </div>

          <div className="relative">
            <Input
              type="search"
              placeholder="Search by name, email, or code…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCertPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="info-outline"
              onClick={() => setPdfBatchConfirm("missing")}
              disabled={pdfBatchPending}
              className="flex-1 whitespace-nowrap sm:flex-none"
            >
              <RefreshCcw size={15} />
              Regenerate missing PDFs
            </Button>
            <Button
              variant="neutral-outline"
              onClick={() => setPdfBatchConfirm("all")}
              disabled={pdfBatchPending}
              className="flex-1 whitespace-nowrap sm:flex-none"
            >
              <FileDown size={15} />
              Regenerate all PDFs
            </Button>
          </div>

          {selectedIds.size > 0 && (
            <div className="rounded-2xl border border-border bg-surface px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Selection summary */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{selectedIds.size} selected</span>
                </div>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-lg px-2.5 py-1 text-xs text-text-secondary/80 transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  Clear
                </button>
              </div>

              <div className="my-3 border-t border-border" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setBulkConfirm({ action: "issue", ids: pendingIds })}
                  disabled={pendingIds.length === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-success/40 bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success transition-colors hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <BadgeCheck size={12} />
                  Issue ({pendingIds.length})
                </button>
                <button
                  onClick={() => setBulkConfirm({ action: "reprocess", ids: rejectedIds })}
                  disabled={rejectedIds.length === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <RefreshCcw size={12} />
                  Reprocess ({rejectedIds.length})
                </button>
                <button
                  onClick={() => setBulkConfirm({ action: "revoke", ids: issuedIds })}
                  disabled={issuedIds.length === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-warning/40 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-warning transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ShieldOff size={12} />
                  Revoke ({issuedIds.length})
                </button>
                <button
                  onClick={() => setBulkConfirm({ action: "reject", ids: pendingIds })}
                  disabled={pendingIds.length === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <XCircle size={12} />
                  Reject ({pendingIds.length})
                </button>
                <button
                  onClick={() => setBulkConfirm({ action: "delete", ids: deletableIds })}
                  disabled={deletableIds.length === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={12} />
                  Delete ({deletableIds.length})
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {pageCerts.length === 0 && searchQuery.trim() && (
              <p className="py-6 text-center text-sm text-text-secondary">
                No certificates match &ldquo;{searchQuery}&rdquo;
              </p>
            )}
            {pageCerts.map((cert) => (
              <div key={cert.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded shrink-0"
                  checked={selectedIds.has(cert.id)}
                  onChange={(e) => toggleId(cert.id, e.target.checked)}
                />
                <div
                  onClick={() => setViewId(cert.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setViewId(cert.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`flex-1 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                    viewCert?.id === cert.id
                      ? "border-primary bg-primary-soft text-text-primary shadow-sm ring-1 ring-primary/25"
                      : "border-border bg-elevated text-text-primary hover:border-primary/30 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      {getRecipientLabel(cert, fields)}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {cert.version > 1 && (
                        <Badge tone="info">{`v${cert.version}`}</Badge>
                      )}
                      <CertificateStatusIcon
                        status={cert.status}
                        active={viewCert?.id === cert.id}
                      />
                    </div>
                  </div>
                  {cert.verificationCode && (
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-xs opacity-70">
                        {cert.verificationCode}
                      </p>
                      {cert.status === "ISSUED" && cert.pdfStatus === "DONE" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            generatePdfMutation.mutate(cert.id);
                          }}
                          disabled={generatePdfMutation.isPending}
                          className={`shrink-0 cursor-pointer font-body text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            viewCert?.id === cert.id
                              ? "text-primary hover:text-primary-hover"
                              : "text-primary hover:text-primary-hover"
                          }`}
                        >
                          {generatePdfMutation.isPending ? "Queuing..." : "Regenerate PDF"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={certPage}
            totalPages={totalPages}
            onPageChange={(p) => {
              setCertPage(p);
              setSelectedIds(new Set());
            }}
            pageSize={certPageSize}
            onPageSizeChange={(size) => {
              setCertPageSize(size);
              setCertPage(1);
              setSelectedIds(new Set());
            }}
          />
        </Card>

        {/* Right — detail panel */}
        <Card>
          {viewCert ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold text-text-primary">
                    Certificate preview
                  </p>
                  <p className="text-sm text-text-secondary">
                    Dynamic data as stored on the certificate record.
                  </p>
                </div>
                <Badge tone={statusTone(viewCert.status)}>
                  {viewCert.status}
                </Badge>
              </div>

              <div className="rounded-[28px] border border-border bg-elevated p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(viewCert.data).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-[20px] bg-surface px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-text-secondary/80">
                        {key}
                      </p>
                      <p className="mt-2 font-medium text-text-primary">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary certificate actions */}
              <div className="flex flex-wrap items-center gap-2">
                {viewCert.status === "PENDING" && (
                  <Button
                    onClick={() => issueMutation.mutate(viewCert.id)}
                    disabled={issueMutation.isPending}
                  >
                    <BadgeCheck size={15} />
                    {issueMutation.isPending ? "Issuing..." : "Issue Now"}
                  </Button>
                )}
                {viewCert.status === "REJECTED" && (
                  <Button
                    onClick={() => reprocessMutation.mutate(viewCert.id)}
                    disabled={reprocessMutation.isPending || certificates.some((c) => c.parentId === viewCert.id)}
                    title={certificates.some((c) => c.parentId === viewCert.id) ? "A reprocessed version already exists" : undefined}
                  >
                    <RefreshCcw size={15} />
                    {reprocessMutation.isPending
                      ? "Reprocessing..."
                      : "Reprocess"}
                  </Button>
                )}
                {viewCert.status === "PENDING" && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditValues(certificateDataToFormValues(viewCert, fields));
                      setEditModalOpen(true);
                    }}
                  >
                    <Pencil size={15} />
                    Edit
                  </Button>
                )}
                {(viewCert.status === "PENDING" ||
                  viewCert.status === "REJECTED" ||
                  viewCert.status === "REVOKED") && (
                  <Button
                    variant="danger-outline"
                    onClick={() => {
                      if (deleteConfirmId === viewCert.id)
                        deleteMutation.mutate(viewCert.id);
                      else setDeleteConfirmId(viewCert.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={15} />
                    {deleteMutation.isPending
                      ? "Deleting..."
                      : deleteConfirmId === viewCert.id
                        ? "Confirm delete?"
                        : "Delete"}
                  </Button>
                )}
                {viewCert.status === "PENDING" && (
                  <Button
                    variant="danger-outline"
                    onClick={() =>
                      setCertConfirm({ action: "reject", id: viewCert.id })
                    }
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle size={15} />
                    Reject
                  </Button>
                )}
              </div>

              {/* Row 2: Two-column grid for ISSUED — Left: Correct + PDF, Right: Revoke + Reject */}
              {viewCert.status === "ISSUED" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="success-outline"
                      className="hover:bg-success-soft"
                      onClick={() => {
                        setEditValues(certificateDataToFormValues(viewCert, fields));
                        setCorrectionModalOpen(true);
                      }}
                    >
                      <PenLine size={15} />
                      Correct
                    </Button>
                    {(viewCert.pdfStatus === "PENDING" ||
                      viewCert.pdfStatus === "PROCESSING") && (
                      <>
                        <Button variant="info-outline" disabled>
                          <Loader2 size={15} className="animate-spin" />
                          {viewCert.pdfUrl ? "Generating replacement PDF..." : "Generating PDF..."}
                        </Button>
                        {viewCert.pdfUrl && (
                          <a
                            href={resolvePdfAssetUrl(viewCert.pdfUrl) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="secondary" className="w-full">
                              <Download size={15} />
                              Download current PDF
                            </Button>
                          </a>
                        )}
                      </>
                    )}
                    {viewCert.pdfStatus === "DONE" && viewCert.pdfUrl && (
                      <a
                        href={resolvePdfAssetUrl(viewCert.pdfUrl) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          variant="info-outline"
                          className="w-full hover:bg-primary-soft"
                        >
                          <Download size={15} />
                          Download PDF
                        </Button>
                      </a>
                    )}
                    {(viewCert.pdfStatus === "FAILED" ||
                      viewCert.pdfStatus === null) && (
                      <>
                        {viewCert.pdfUrl && (
                          <a
                            href={resolvePdfAssetUrl(viewCert.pdfUrl) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="secondary" className="w-full">
                              <Download size={15} />
                              Download current PDF
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => generatePdfMutation.mutate(viewCert.id)}
                          disabled={generatePdfMutation.isPending}
                        >
                          <FileDown size={15} />
                          {generatePdfMutation.isPending
                            ? "Queuing..."
                            : viewCert.pdfStatus === "FAILED"
                              ? "Retry PDF"
                              : "Generate PDF"}
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="warning-outline"
                      className=""
                      onClick={() =>
                        setCertConfirm({ action: "revoke", id: viewCert.id })
                      }
                      disabled={revokeMutation.isPending}
                    >
                      <ShieldOff size={15} />
                      Revoke
                    </Button>
                    <Button
                      variant="danger-outline"
                      className="hover:bg-danger-soft"
                      onClick={() =>
                        setCertConfirm({ action: "reject", id: viewCert.id })
                      }
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle size={15} />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {viewCert.parentId && (
                <p className="text-xs text-text-secondary">
                  This is version {viewCert.version} · corrected from a previous
                  certificate
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-elevated p-5">
                  <p className="text-sm text-text-secondary">Issued at</p>
                  <p className="mt-2 font-semibold text-text-primary">
                    {formatDateTime(viewCert.issuedAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-elevated p-5">
                  <p className="text-sm text-text-secondary">Verification code</p>
                  <p className="mt-2 break-all font-semibold text-text-primary">
                    {viewCert.verificationCode ?? "Not generated"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        open={editModalOpen}
        title="Edit certificate data"
        onClose={() => setEditModalOpen(false)}
      >
        <CertificateDataForm
          fields={fields}
          values={editValues}
          onChange={setEditValues}
          onSubmit={() => {
            if (!viewCert) return;
            updateMutation.mutate({
              id: viewCert.id,
              data: buildCertificateData(fields, editValues),
            });
          }}
          submitLabel="Save changes"
          pendingLabel="Saving..."
          isPending={updateMutation.isPending}
        />
      </Modal>

      <Modal
        open={correctionModalOpen}
        title="Correct issued certificate"
        onClose={() => setCorrectionModalOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            The current certificate will be revoked and a new version will be
            issued with the corrected data.
          </p>
          <CertificateDataForm
            fields={fields}
            values={editValues}
            onChange={setEditValues}
            onSubmit={() => {
              if (!viewCert) return;
              correctMutation.mutate({
                id: viewCert.id,
                data: buildCertificateData(fields, editValues),
              });
            }}
            submitLabel="Issue corrected version"
            pendingLabel="Correcting..."
            isPending={correctMutation.isPending}
          />
        </div>
      </Modal>

      <Modal
        open={bulkConfirm !== null}
        title="Confirm bulk action"
        onClose={() => setBulkConfirm(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will {bulkConfirm?.action}{" "}
            <span className="font-semibold">{bulkConfirm?.ids.length}</span>{" "}
            certificate{bulkConfirm?.ids.length !== 1 ? "s" : ""}.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleBulkConfirm} disabled={bulkPending}>
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setBulkConfirm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={pdfBatchConfirm !== null}
        title={
          pdfBatchConfirm === "all"
            ? "Regenerate all PDFs"
            : "Regenerate missing PDFs"
        }
        onClose={() => setPdfBatchConfirm(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {pdfBatchConfirm === "all"
              ? "This will queue every issued certificate in this batch, except PDFs already processing."
              : "This will queue issued certificates with failed, absent, or deleted PDF files."}
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePdfBatchConfirm} disabled={pdfBatchPending}>
              <RefreshCcw size={15} />
              {pdfBatchPending ? "Queuing..." : "Confirm"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPdfBatchConfirm(null)}
              disabled={pdfBatchPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={certConfirm !== null}
        title={
          certConfirm?.action === "revoke" ? "Confirm revoke" : "Confirm reject"
        }
        onClose={() => setCertConfirm(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {certConfirm?.action === "revoke"
              ? "This will permanently revoke the issued certificate. The recipient will lose access."
              : viewCert?.status === "ISSUED"
                ? "This will invalidate the current PDF and reject this issued version. Reprocessing will create a new editable certificate version."
                : "This will reject the certificate. You can reprocess it later if needed."}
          </p>
          <div className="flex gap-2">
            <Button
              variant={
                certConfirm?.action === "revoke"
                  ? "warning-outline"
                  : "danger-outline"
              }
              onClick={handleCertConfirm}
              disabled={revokeMutation.isPending || rejectMutation.isPending}
            >
              {certConfirm?.action === "revoke" ? (
                <ShieldOff size={15} />
              ) : (
                <XCircle size={15} />
              )}
              {certConfirm?.action === "revoke"
                ? "Revoke certificate"
                : "Reject certificate"}
            </Button>
            <Button variant="secondary" onClick={() => setCertConfirm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
