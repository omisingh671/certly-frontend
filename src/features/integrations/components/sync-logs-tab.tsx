import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, ExternalLink, Search, XCircle } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

export const SyncLogsTab = () => {
  const [logsPage, setLogsPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [logsStatusFilter, setLogsStatusFilter] = useState("all");
  const [logsClientFilter, setLogsClientFilter] = useState("all");
  const [logsSearch, setLogsSearch] = useState("");

  // Detail Modal
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Load clients for dropdown
  const clientsListQuery = useQuery({
    queryKey: ["integration-clients-dropdown"],
    queryFn: () => api.integrations.clients.list(1, 100),
  });
  const allClients = clientsListQuery.data?.items ?? [];

  // Logs Query
  const logsQuery = useQuery({
    queryKey: ["integration-logs", logsPage, pageSize, logsStatusFilter, logsClientFilter, logsSearch],
    queryFn: () =>
      api.integrations.events.list(logsPage, pageSize, {
        clientId: logsClientFilter === "all" ? undefined : logsClientFilter,
        status: logsStatusFilter === "all" ? undefined : logsStatusFilter,
        search: logsSearch || undefined,
      }),
  });

  // Selected Log Details Query
  const logDetailQuery = useQuery({
    queryKey: ["integration-log-detail", selectedLogId],
    queryFn: () => api.integrations.events.get(selectedLogId!),
    enabled: Boolean(selectedLogId) && logDetailOpen,
  });

  useQueryErrorToast(logsQuery.isError, logsQuery.error, "Failed to load integration logs");

  const getStatusTone = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "success";
      case "FAILED":
        return "danger";
      case "RECEIVED":
        return "info";
      case "DUPLICATE":
        return "warning";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-4">
      {/* Logs filters */}
      <Card className="grid gap-4 md:grid-cols-[1.5fr_1.5fr_2fr] md:items-end p-4">
        <Field label="Filter by LMS Client">
          <Select
            value={logsClientFilter}
            onChange={(e) => {
              setLogsClientFilter(e.target.value);
              setLogsPage(1);
            }}
          >
            <option value="all">All Clients</option>
            {allClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Filter by Status">
          <Select
            value={logsStatusFilter}
            onChange={(e) => {
              setLogsStatusFilter(e.target.value);
              setLogsPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </Select>
        </Field>

        <Field label="Search">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-secondary" />
            <Input
              className="pl-10"
              placeholder="Search by learner, course, or event ID..."
              value={logsSearch}
              onChange={(e) => {
                setLogsSearch(e.target.value);
                setLogsPage(1);
              }}
            />
          </div>
        </Field>
      </Card>

      {/* Sync logs Table */}
      {(logsQuery.data?.items ?? []).length === 0 ? (
        <EmptyState
          title="No Sync Logs Found"
          description="LMS events triggered by external integrations will appear here."
        />
      ) : (
        <Card className="rounded-[30px] p-6 shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-medium">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">LMS Client</th>
                  <th className="py-3 px-4">Learner Details</th>
                  <th className="py-3 px-4">Course / Group ID</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {(logsQuery.data?.items ?? []).map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-elevated/40">
                    <td className="py-3.5 px-4">
                      <Badge tone={getStatusTone(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-text-primary">{log.clientName}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{log.learnerName}</div>
                      <div className="text-xs text-text-secondary">{log.learnerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-text-primary">{log.externalCourseId}</div>
                      {log.externalGroupId && (
                        <div className="text-[10px] text-text-secondary font-mono">
                          Group: {log.externalGroupId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {log.certificateId ? (
                        <a
                          href={`/verify?code=${
                            (log.payload as { certificateFields?: { recipientEmail?: string } })
                              ?.certificateFields?.recipientEmail || log.learnerEmail
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <span>Certificate</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedLogId(log.id);
                          setLogDetailOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Pagination
              page={logsPage}
              totalPages={logsQuery.data?.pagination.totalPages ?? 1}
              onPageChange={setLogsPage}
            />
          </div>
        </Card>
      )}

      {/* Event Sync Log Detail Modal */}
      <Modal open={logDetailOpen} title="Sync Event Log Details" onClose={() => setLogDetailOpen(false)}>
        {logDetailQuery.isPending ? (
          <div className="py-8 text-center text-text-secondary">Loading details...</div>
        ) : logDetailQuery.data ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Event Status">
                <div>
                  <Badge tone={getStatusTone(logDetailQuery.data.status)}>
                    {logDetailQuery.data.status}
                  </Badge>
                </div>
              </Field>
              <Field label="LMS Client">
                <div className="font-semibold text-text-primary">{logDetailQuery.data.clientName}</div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Event Type">
                <div className="font-mono text-xs">{logDetailQuery.data.eventType}</div>
              </Field>
              <Field label="LMS Event ID">
                <div className="font-mono text-xs">{logDetailQuery.data.externalEventId}</div>
              </Field>
            </div>

            <div className="border-t border-border pt-3">
              <p className="font-semibold text-text-primary text-sm mb-2">Recipient & Course Metadata</p>
              <div className="grid grid-cols-2 gap-4 bg-elevated/40 p-3.5 rounded-2xl border border-border">
                <div>
                  <p className="text-xs text-text-secondary">Learner</p>
                  <p className="font-semibold text-text-primary">{logDetailQuery.data.learnerName}</p>
                  <p className="text-xs text-text-secondary">{logDetailQuery.data.learnerEmail}</p>
                  <p className="text-[10px] text-text-secondary font-mono">
                    ID: {logDetailQuery.data.externalLearnerId || "None"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Course & Group</p>
                  <p className="font-semibold text-text-primary">
                    ID: {logDetailQuery.data.externalCourseId}
                  </p>
                  {logDetailQuery.data.externalGroupId && (
                    <p className="text-xs text-text-primary">
                      Group ID: {logDetailQuery.data.externalGroupId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {logDetailQuery.data.errorMessage && (
              <div className="rounded-3xl border border-danger-soft bg-danger-soft/10 p-4 text-danger flex items-start gap-3">
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Issuance Failed Error</p>
                  <p className="text-sm text-text-secondary mt-1">
                    {logDetailQuery.data.errorMessage}
                  </p>
                </div>
              </div>
            )}

            {logDetailQuery.data.certificateId && (
              <div className="rounded-3xl border border-success-soft bg-success-soft/10 p-4 text-success flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Certificate Issued</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Certificate ID: {logDetailQuery.data.certificateId}
                    </p>
                  </div>
                </div>
                <a
                  href={`/verify?code=${
                    (logDetailQuery.data.payload as { certificateFields?: { recipientEmail?: string } })
                      ?.certificateFields?.recipientEmail || logDetailQuery.data.learnerEmail
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <span>Verify</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="font-semibold text-text-primary text-sm mb-2">Raw Payload JSON</p>
              <pre className="text-xs font-mono bg-surface p-4 rounded-2xl border border-border overflow-x-auto text-text-primary max-h-48">
                {JSON.stringify(logDetailQuery.data.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3">
              <Button onClick={() => setLogDetailOpen(false)}>Close Details</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-text-secondary">No data found</div>
        )}
      </Modal>
    </div>
  );
};
