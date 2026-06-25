import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type {
  CertificateAuditAction,
  CertificateAuditRecordStatus,
} from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, titleCase } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";
import {
  Search,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Clock,
  User,
  Calendar,
  Code,
  Info,
  List,
  Shield,
  Filter,
  History,
} from "lucide-react";

const recordStatusTone: Record<CertificateAuditRecordStatus, "success" | "danger" | "warning" | "neutral"> = {
  ISSUED: "success",
  REJECTED: "danger",
  DELETED: "warning",
  REVOKED: "neutral",
};

const actionTone: Record<CertificateAuditAction, "info" | "success" | "warning" | "danger" | "neutral"> = {
  CREATED: "info",
  UPDATED: "info",
  ISSUED: "success",
  REJECTED: "danger",
  REVOKED: "neutral",
  DELETED: "warning",
};

const getActionIcon = (action: CertificateAuditAction) => {
  switch (action) {
    case "CREATED":
      return <Plus className="h-3.5 w-3.5" />;
    case "UPDATED":
      return <RotateCcw className="h-3.5 w-3.5" />;
    case "ISSUED":
      return <Check className="h-3.5 w-3.5" />;
    case "REJECTED":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "REVOKED":
      return <Shield className="h-3.5 w-3.5" />;
    case "DELETED":
      return <Trash2 className="h-3.5 w-3.5" />;
    default:
      return <Info className="h-3.5 w-3.5" />;
  }
};

const SnapshotExpander = ({ snapshot }: { snapshot: Record<string, unknown> }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border/60 pt-2.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors focus:outline-none"
      >
        <Code className="h-3 w-3" />
        {isOpen ? "Hide Snapshot Payload" : "View Snapshot Payload"}
      </button>
      {isOpen && (
        <pre className="mt-2 overflow-x-auto rounded-xl bg-elevated p-3 text-[11px] font-mono text-text-secondary leading-relaxed border border-border/50 max-h-[200px] select-all">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </div>
  );
};

export const CertificateAuditPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "data" | "timeline">("info");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const auditListQuery = useQuery({
    queryKey: ["certificate-audit", page, pageSize, batchFilter],
    queryFn: () =>
      api.certificateAudit.list(page, pageSize, batchFilter === "all" ? undefined : batchFilter),
  });

  const batchesQuery = useQuery({
    queryKey: ["batches-all"],
    queryFn: () => api.batches.list(1, 100),
  });

  useQueryErrorToast(auditListQuery.isError, auditListQuery.error, "Failed to load audit records");
  useQueryErrorToast(batchesQuery.isError, batchesQuery.error, "Failed to load batch list");

  useEffect(() => {
    const items = auditListQuery.data?.items ?? [];

    if (!items.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [auditListQuery.data, selectedId]);

  const auditDetailQuery = useQuery({
    queryKey: ["certificate-audit-detail", selectedId],
    queryFn: () => api.certificateAudit.get(selectedId!),
    enabled: selectedId !== null,
  });

  useQueryErrorToast(auditDetailQuery.isError, auditDetailQuery.error, "Failed to load certificate details");

  const records = auditListQuery.data?.items ?? [];
  const batches = batchesQuery.data?.items ?? [];
  const selectedRecord = auditDetailQuery.data;

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const copyToClipboard = (text: string, type: "id" | "code") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Filter records based on local search query
  const filteredRecords = records.filter((record) => {
    const query = searchQuery.toLowerCase();
    const recipient = record.recipientLabel.toLowerCase();
    const batchName = record.batch.name.toLowerCase();
    const templateName = record.template.name.toLowerCase();
    return (
      recipient.includes(query) ||
      batchName.includes(query) ||
      templateName.includes(query) ||
      record.id.toLowerCase().includes(query)
    );
  });

  // Dynamic status summaries computed on client side from records
  const totalAudited = auditListQuery.data?.pagination.total ?? records.length;
  const totalIssuedOnPage = records.filter((r) => r.recordStatus === "ISSUED").length;
  const totalRevokedOnPage = records.filter((r) => r.recordStatus === "REVOKED").length;
  const totalRejectedOnPage = records.filter((r) => r.recordStatus === "REJECTED").length;
  const totalDeletedOnPage = records.filter((r) => r.recordStatus === "DELETED").length;

  if (auditListQuery.isPending) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="space-y-2">
          <div className="h-9 w-64 rounded-2xl bg-border" />
          <div className="h-4 w-96 rounded-xl bg-border" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-border" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 h-[500px] rounded-[28px] bg-border" />
          <div className="lg:col-span-2 h-[500px] rounded-[28px] bg-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-text-primary flex items-center gap-2">
          Certificate Audit Log
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Inspect issued, rejected, and deleted certificates with actor-level audit history.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Audited",
            value: totalAudited,
            sub: "All-time database count",
            color: "text-primary bg-primary-soft",
            icon: History,
          },
          {
            label: "Issued Status",
            value: totalIssuedOnPage,
            sub: "Active on this page",
            color: "text-success bg-success-soft",
            icon: Check,
          },
          {
            label: "Revoked Status",
            value: totalRevokedOnPage,
            sub: "Revoked on this page",
            color: "text-text-secondary bg-elevated border border-border",
            icon: Shield,
          },
          {
            label: "Rejected Status",
            value: totalRejectedOnPage,
            sub: "Rejected on this page",
            color: "text-danger bg-danger-soft",
            icon: AlertTriangle,
          },
          {
            label: "Deleted Status",
            value: totalDeletedOnPage,
            sub: "Deleted on this page",
            color: "text-warning bg-accent-soft",
            icon: Trash2,
          },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.label}
              className="surface-card rounded-[24px] border p-4 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary/70 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary leading-none">{stat.value}</p>
                <p className="text-[10px] text-text-secondary/60 font-medium">{stat.sub}</p>
              </div>
              <div className={`p-2.5 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <StatIcon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {records.length ? (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Panel — Records Card (3/5 width) */}
          <Card className="lg:col-span-3 space-y-4 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl font-bold text-text-primary">Certificate Records</p>
                <p className="text-xs text-text-secondary">Select a row below to inspect detailed actor audit logs.</p>
              </div>
            </div>

            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3.5 h-4.5 w-4.5 text-text-secondary/50" />
                <input
                  type="text"
                  placeholder="Search recipient, email, batch, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-surface py-2 pr-4 pl-10 text-sm placeholder:text-text-secondary/40 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="relative w-full sm:w-52 shrink-0">
                <Filter className="absolute top-2.5 left-3.5 h-4.5 w-4.5 text-text-secondary/50 pointer-events-none" />
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setPage(1);
                    setSelectedId(null);
                  }}
                  className="w-full rounded-2xl border border-border bg-surface py-2 pr-10 pl-10 text-sm focus:border-primary focus:outline-none transition-colors appearance-none"
                >
                  <option value="all">All batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} title={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary/60">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Records list/table */}
            {filteredRecords.length ? (
              <div className="overflow-x-auto rounded-[24px] border border-border bg-surface no-scrollbar">
                <div>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-elevated">
                      <tr>
                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Recipient</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Batch</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Last Action</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRecords.map((record) => {
                        const isSelected = selectedId === record.id;
                        return (
                          <tr
                            key={record.id}
                            onClick={() => setSelectedId(record.id)}
                            className={`group cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "bg-primary-soft/50 border-l-4 border-l-primary"
                                : "hover:bg-elevated/70 border-l-4 border-l-transparent"
                            }`}
                          >
                            <td className="px-4 py-3.5 text-sm">
                              <div className="flex flex-col">
                                <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                                  {record.recipientLabel.split(" · ")[0]}
                                </p>
                                <p className="text-xs text-text-secondary/80 font-normal">
                                  {record.recipientLabel.split(" · ")[1] ?? ""}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-text-secondary">
                              <div className="max-w-[140px] truncate" title={record.batch.name}>
                                {record.batch.name}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-text-secondary">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-text-primary">
                                  {record.lastAction?.action ? titleCase(record.lastAction.action) : "—"}
                                </span>
                                <span className="text-text-secondary/70">
                                  {record.lastAction?.at ? formatDateTime(record.lastAction.at) : "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge tone={recordStatusTone[record.recordStatus]}>
                                {record.recordStatus}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-[24px] py-12 text-center text-sm text-text-secondary">
                No matching records found.
              </div>
            )}

            {/* Pagination */}
            {(auditListQuery.data?.pagination.totalPages ?? 1) > 1 && (
              <div className="pt-2">
                <Pagination
                  page={auditListQuery.data?.pagination.page ?? 1}
                  totalPages={auditListQuery.data?.pagination.totalPages ?? 1}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </Card>

          {/* Right Panel — Details & History Card (2/5 width) */}
          <Card className="lg:col-span-2 space-y-4 flex flex-col h-full lg:sticky lg:top-4">
            {selectedRecord ? (
              <>
                {/* Header */}
                <div className="border-b border-border pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-text-primary leading-tight">
                        {selectedRecord.recipientLabel.split(" · ")[0]}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {selectedRecord.recipientLabel.split(" · ")[1] ?? ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge tone={recordStatusTone[selectedRecord.recordStatus]}>
                        {selectedRecord.recordStatus}
                      </Badge>
                      {selectedRecord.currentStatus && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary/50">
                          Current: {selectedRecord.currentStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl bg-elevated/70 px-3 py-1.5 border border-border/50">
                    <span className="text-[11px] text-text-secondary/85 font-mono select-all truncate flex-1">
                      ID: {selectedRecord.id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedRecord.id, "id")}
                      className="rounded p-1 hover:bg-muted transition-colors text-text-secondary/60 hover:text-text-primary shrink-0 focus:outline-none"
                      title="Copy Certificate ID"
                    >
          {copiedId ? <Check className="h-3.5 w-3.5 text-success animate-scale" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto no-scrollbar border-b border-border">
                  {([
                    { id: "info", label: "Info", icon: Info },
                    { id: "data", label: "Payload", icon: Code },
                    { id: "timeline", label: "Logs", icon: History },
                  ] satisfies Array<{
                    id: typeof activeTab;
                    label: string;
                    icon: typeof Info;
                  }>).map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all duration-200 flex items-center justify-center gap-1.5 focus:outline-none shrink-0 ${
                          isActive
                            ? "border-primary text-primary bg-primary-soft/10"
                            : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                        }`}
                      >
                        <TabIcon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                <div className="pt-2 space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
                  {activeTab === "info" && (
                    <div className="space-y-3">
                      {[
                        { label: "Template", value: selectedRecord.template.name, icon: FileText },
                        { label: "Batch", value: selectedRecord.batch.name, icon: List },
                        { label: "Issuer", value: selectedRecord.template.issuer?.name ?? selectedRecord.template.issuer?.email ?? "Unavailable", icon: User },
                        { label: "Batch Owner", value: selectedRecord.batch.createdBy?.name ?? selectedRecord.batch.createdBy?.email ?? "Unavailable", icon: User },
                        { label: "Verification Code", value: selectedRecord.verificationCode ?? "Not generated", icon: Shield, copyable: true },
                        { label: "Issued At", value: selectedRecord.issuedAt ? formatDateTime(selectedRecord.issuedAt) : "—", icon: Calendar },
                        { label: "Deleted At", value: selectedRecord.deletedAt ? formatDateTime(selectedRecord.deletedAt) : null, icon: Trash2 },
                      ].map((item) => {
                        if (item.value === null) return null;
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="flex flex-col gap-1 rounded-2xl bg-surface border border-border px-3.5 py-3 shadow-sm hover:shadow-soft transition-all duration-150"
                          >
                            <div className="flex items-center gap-1.5 text-text-secondary/70">
                              <ItemIcon className="h-3.5 w-3.5 text-text-secondary/50" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-0.5">
                              <p className="text-sm font-semibold text-text-primary break-all">{item.value}</p>
                              {item.copyable && selectedRecord.verificationCode && (
                                <button
                                  onClick={() => copyToClipboard(selectedRecord.verificationCode!, "code")}
                                  className="rounded p-1.5 hover:bg-elevated text-text-secondary/60 hover:text-text-primary shrink-0 transition-colors focus:outline-none"
                                  title="Copy Verification Code"
                                >
                                  {copiedCode ? <Check className="h-3.5 w-3.5 text-success animate-scale" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === "data" && (
                    <div className="space-y-3">
                      {Object.keys(selectedRecord.data).length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(selectedRecord.data).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex flex-col gap-1 rounded-2xl bg-surface border border-border px-3.5 py-3 shadow-sm hover:shadow-soft transition-all duration-150"
                            >
                              <span className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider">
                                {titleCase(key)}
                              </span>
                              <p className="text-sm font-semibold text-text-primary mt-0.5 break-all">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-text-secondary border border-dashed border-border rounded-2xl">
                          No custom field data stored.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <div className="relative pl-6 space-y-6 pt-2 border-l-2 border-border ml-3.5">
                      {selectedRecord.history.length ? (
                        selectedRecord.history.map((entry) => {
                          const ActionIcon = getActionIcon(entry.action);
                          const tone = actionTone[entry.action];
                          return (
                            <div key={entry.id} className="relative group/timeline-item">
                              {/* Connector dot */}
                              <div
                                className={`absolute -left-[35px] top-1.5 rounded-full p-1.5 ring-4 ring-surface flex items-center justify-center transition-transform duration-250 group-hover/timeline-item:scale-115 ${
                                  tone === "success" ? "bg-success-soft text-success" :
                                  tone === "danger" ? "bg-danger-soft text-danger" :
                                  tone === "warning" ? "bg-accent-soft text-warning" :
                                  tone === "info" ? "bg-primary-soft text-primary" :
                                  "bg-elevated text-text-secondary"
                                }`}
                              >
                                {ActionIcon}
                              </div>

                              {/* Timeline card */}
                              <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm hover:shadow-soft transition-all duration-150">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-border/40 pb-2">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 w-fit ${
                                      tone === "success" ? "bg-success-soft text-success" :
                                      tone === "danger" ? "bg-danger-soft text-danger" :
                                      tone === "warning" ? "bg-accent-soft text-warning" :
                                      tone === "info" ? "bg-primary-soft text-primary" :
                                      "bg-elevated text-text-secondary"
                                    }`}
                                  >
                                    {titleCase(entry.action)}
                                  </span>
                                  <span className="text-[10px] text-text-secondary/70 font-medium flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(entry.at)}
                                  </span>
                                </div>

                                <div className="mt-2.5 flex items-start gap-2">
                                  <User className="h-4 w-4 text-text-secondary/40 mt-0.5 shrink-0" />
                                  <div className="text-xs">
                                    <p className="font-semibold text-text-primary">
                                      {entry.actor?.name ?? "System actor"}
                                    </p>
                                    <p className="text-text-secondary/80 mt-0.5">
                                      {entry.actor?.email ?? "system@cms.local"}
                                    </p>
                                  </div>
                                </div>

                                {/* Snapshot Payload Expander */}
                                <SnapshotExpander snapshot={entry.snapshot} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-sm text-text-secondary -ml-6">
                          No timeline logs found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-elevated p-4 mb-4 ring-8 ring-elevated/40">
                  <Shield className="h-10 w-10 text-text-secondary/30 animate-pulse" />
                </div>
                <p className="font-display text-base font-bold text-text-primary">No record selected</p>
                <p className="mt-1.5 max-w-[240px] text-xs text-text-secondary">
                  Select a certificate record on the left to inspect its timeline and complete history logs.
                </p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-xl font-bold text-text-primary">Certificate records</p>
                <p className="text-xs text-text-secondary">Select a certificate to view its full audit history.</p>
              </div>
              <div className="relative w-48 shrink-0">
                <Filter className="absolute top-2.5 left-3 h-4.5 w-4.5 text-text-secondary/60 pointer-events-none" />
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setPage(1);
                    setSelectedId(null);
                  }}
                  className="w-full rounded-2xl border border-border bg-surface py-2 pr-8 pl-10 text-sm focus:border-primary focus:outline-none transition-colors appearance-none"
                >
                  <option value="all">All batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} title={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary/60">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <EmptyState
              title="No auditable certificates yet"
              description={
                batchFilter !== "all"
                  ? "No certificates found for the selected batch."
                  : "Issued, rejected, and deleted certificates will appear here for Super Admin review."
              }
            />
          </Card>
        </div>
      )}
    </div>
  );
};
