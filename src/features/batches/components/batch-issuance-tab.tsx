import { ChangeEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { BulkIssuanceResultDto, CsvValidationRowDto, TemplateFieldDto } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { rowsToCsv } from "@/lib/csv";
import {
  createCsvSummary,
  getCsvUploadErrorMessage,
  getCsvRowErrorMessages,
  summarizeCsvValidationIssues,
  validateCsvDraftRow,
} from "./csv-validation";

type IssuanceStatus = "PENDING" | "ISSUED" | "REJECTED";
const STATUSES: IssuanceStatus[] = ["PENDING", "ISSUED", "REJECTED"];

const normalizeFieldValue = (field: TemplateFieldDto, value: string): string | number =>
  field.type === "NUMBER" ? Number(value) : value;

const inputType = (type: TemplateFieldDto["type"]) =>
  type === "NUMBER" ? "number" : type === "DATE" ? "date" : type === "EMAIL" ? "email" : "text";

const CsvIssuanceResult = ({
  result,
  onViewCertificates,
  onIssueAnotherCsv,
}: {
  result: BulkIssuanceResultDto;
  onViewCertificates: () => void;
  onIssueAnotherCsv: () => void;
}) => {
  const { succeeded, failed, skipped } = result.summary;
  const hasIssuedCertificates = succeeded > 0;
  const fullySuccessful = hasIssuedCertificates && failed === 0 && skipped === 0;
  const title = fullySuccessful
    ? `${succeeded} certificate${succeeded === 1 ? "" : "s"} issued successfully`
    : hasIssuedCertificates
      ? "CSV issuance completed with exceptions"
      : "No certificates were issued";
  const panelClassName = fullySuccessful
    ? "border-success/30 bg-success-soft/35 text-success"
    : hasIssuedCertificates
      ? "border-warning/30 bg-accent-soft text-warning"
      : "border-danger/30 bg-danger-soft text-danger";

  return (
    <section className={`space-y-4 rounded-[24px] border p-5 ${panelClassName}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        {fullySuccessful ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {hasIssuedCertificates
              ? "The issued certificates are ready to review in the Certificates tab."
              : "Review the failed rows below, then upload a corrected CSV to try again."}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center text-text-primary">
        <div className="rounded-2xl bg-surface/80 px-3 py-2">
          <dt className="text-xs text-text-secondary">Issued</dt>
          <dd className="mt-1 font-semibold">{succeeded}</dd>
        </div>
        <div className="rounded-2xl bg-surface/80 px-3 py-2">
          <dt className="text-xs text-text-secondary">Failed</dt>
          <dd className="mt-1 font-semibold">{failed}</dd>
        </div>
        <div className="rounded-2xl bg-surface/80 px-3 py-2">
          <dt className="text-xs text-text-secondary">Skipped</dt>
          <dd className="mt-1 font-semibold">{skipped}</dd>
        </div>
      </dl>

      {result.failed.length > 0 && (
        <div className="rounded-2xl border border-danger/25 bg-surface/80 p-3 text-sm text-text-primary">
          <p className="font-semibold text-danger">Failed rows</p>
          <ul className="mt-2 space-y-2">
            {result.failed.map((row) => (
              <li key={row.row}>
                <span className="font-medium">CSV row {row.row}:</span> {row.error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {hasIssuedCertificates && <Button onClick={onViewCertificates}>View certificates</Button>}
        <Button variant={hasIssuedCertificates ? "secondary" : "primary"} onClick={onIssueAnotherCsv}>
          Issue another CSV
        </Button>
      </div>
    </section>
  );
};

export const BatchIssuanceTab = ({
  batchId,
  fields,
  onViewCertificates,
}: {
  batchId: string;
  fields: TemplateFieldDto[];
  onViewCertificates: () => void;
}) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [singleStatus, setSingleStatus] = useState<IssuanceStatus>("PENDING");
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [csvDraft, setCsvDraft] = useState<CsvValidationRowDto[]>([]);
  const [csvFields, setCsvFields] = useState<string[]>([]);
  const [csvStatus, setCsvStatus] = useState<IssuanceStatus>("PENDING");
  const [csvPage, setCsvPage] = useState(1);
  const [csvPageSize, setCsvPageSize] = useState(10);
  const [csvSummary, setCsvSummary] = useState<{ total: number; valid: number; invalid: number; duplicate: number } | null>(null);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<Set<number>>(new Set());
  const [selectedCsvFileName, setSelectedCsvFileName] = useState<string | null>(null);
  const [csvValidated, setCsvValidated] = useState(false);
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
  const [csvIssuanceResult, setCsvIssuanceResult] = useState<BulkIssuanceResultDto | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const clearCsv = () => {
    setCsvDraft([]);
    setCsvFields([]);
    setCsvSummary(null);
    setCsvPage(1);
    setSelectedRowIndexes(new Set());
    setSelectedCsvFileName(null);
    setCsvValidated(false);
    setCsvUploadError(null);
    if (csvFileInputRef.current) csvFileInputRef.current.value = "";
  };

  const issueAnotherCsv = () => {
    setCsvIssuanceResult(null);
    clearCsv();
  };

  const invalidateBatch = () => {
    void queryClient.invalidateQueries({ queryKey: ["batch-certificates", batchId] });
    void queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
  };

  const validateCsvMutation = useMutation({
    mutationFn: (file: File) => api.batches.validateCsv(batchId, file),
    onSuccess: (result, file) => {
      setCsvDraft(result.rows);
      setCsvFields(result.fields);
      setCsvSummary(result.summary);
      setCsvPage(1);
      setSelectedRowIndexes(new Set(result.rows.flatMap((row, i) => (row.valid && !row.duplicate ? [i] : []))));
      setSelectedCsvFileName(file.name);
      setCsvValidated(true);
      setCsvUploadError(null);
      pushToast({ title: "CSV validated. Review rows before confirming issuance.", tone: "success" });
    },
    onError: (error) => {
      const message = getCsvUploadErrorMessage(error);
      setCsvValidated(false);
      setCsvUploadError(message);
      pushToast({ title: message, tone: "error" });
    },
  });

  const issueCsvMutation = useMutation({
    mutationFn: () => {
      const rows = csvDraft.filter((_, i) => selectedRowIndexes.has(i)).map((r) => r.data);
      return api.batches.issueCsv(batchId, rowsToCsv(csvFields, rows), csvStatus);
    },
    onSuccess: (result) => {
      invalidateBatch();
      clearCsv();
      setCsvIssuanceResult(result);
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const singleIssueMutation = useMutation({
    mutationFn: () =>
      api.batches.issueSingle(batchId, {
        status: singleStatus,
        data: fields.reduce<Record<string, unknown>>((acc, field) => {
          acc[field.name] = normalizeFieldValue(field, singleValues[field.name] ?? "");
          return acc;
        }, {}),
      }),
    onSuccess: () => {
      invalidateBatch();
      setSingleValues({});
      pushToast({ title: "Certificate issued successfully", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvIssuanceResult(null);
      setCsvDraft([]);
      setCsvFields([]);
      setCsvSummary(null);
      setCsvPage(1);
      setSelectedRowIndexes(new Set());
      setSelectedCsvFileName(file.name);
      setCsvValidated(false);
      setCsvUploadError(null);
      validateCsvMutation.mutate(file);
    }
  };

  const validRowIndexes = csvDraft.flatMap((row, i) => (row.valid && !row.duplicate ? [i] : []));
  const allChecked = validRowIndexes.length > 0 && validRowIndexes.every((i) => selectedRowIndexes.has(i));
  const someChecked = validRowIndexes.some((i) => selectedRowIndexes.has(i));
  const validationIssues = summarizeCsvValidationIssues(csvDraft);

  const toggleRowIndex = (globalIndex: number, checked: boolean) =>
    setSelectedRowIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(globalIndex); else next.delete(globalIndex);
      return next;
    });

  const updateCsvCell = (globalIndex: number, fieldName: string, value: string) => {
    const row = csvDraft[globalIndex];
    if (row === undefined) return;

    const data = { ...row.data, [fieldName]: value };
    const error = validateCsvDraftRow(data, fields);
    const valid = error === undefined;
    const rows = csvDraft.map((entry, index) =>
      index === globalIndex ? { ...entry, data, valid, error } : entry,
    );

    setCsvDraft(rows);
    setCsvSummary(createCsvSummary(rows));
    toggleRowIndex(globalIndex, valid && !row.duplicate);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      {/* CSV issuance */}
      <Card className="min-w-0 space-y-5">
        <div>
          <p className="font-display text-2xl font-semibold text-text-primary">CSV issuance</p>
          <p className="text-sm text-text-secondary">Upload, validate, edit invalid rows, then confirm issuance.</p>
        </div>

        {csvIssuanceResult ? (
          <CsvIssuanceResult
            result={csvIssuanceResult}
            onViewCertificates={onViewCertificates}
            onIssueAnotherCsv={issueAnotherCsv}
          />
        ) : (
          <>
        <Field label="Upload CSV">
          <Input
            ref={csvFileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileChange}
            aria-describedby={csvUploadError ? "csv-upload-error" : "csv-upload-status"}
            className={csvValidated
              ? "border-success bg-success-soft/35 focus:border-success"
              : undefined}
          />
        </Field>
        {selectedCsvFileName && csvDraft.length === 0 && (
          <div className="-mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
            <span>Selected: {selectedCsvFileName}</span>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={clearCsv}>
              Clear CSV
            </Button>
          </div>
        )}
        <div id="csv-upload-status" className="-mt-3 min-h-5 text-xs" aria-live="polite">
          {validateCsvMutation.isPending ? (
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Validating CSV…
            </span>
          ) : csvValidated ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success" role="status">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              CSV uploaded — review the rows below.
            </span>
          ) : null}
        </div>
        {csvUploadError && (
          <div id="csv-upload-error" className="-mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
            {csvUploadError}
          </div>
        )}

        <Field label="Issued record status">
          <Select value={csvStatus} onChange={(e) => setCsvStatus(e.target.value as IssuanceStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>

        {csvDraft.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Badge tone="info">{`${selectedRowIndexes.size} selected`}</Badge>
                {csvSummary && (
                  <>
                    <Badge tone="success">{`${csvSummary.valid} valid`}</Badge>
                    {csvSummary.duplicate > 0 && <Badge tone="warning">{`${csvSummary.duplicate} duplicate`}</Badge>}
                    {csvSummary.invalid > 0 && <Badge tone="danger">{`${csvSummary.invalid} invalid`}</Badge>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Rows per page</span>
                  <select
                    className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-primary"
                    value={csvPageSize}
                    onChange={(e) => { setCsvPageSize(Number(e.target.value)); setCsvPage(1); }}
                  >
                    {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <Button variant="secondary" onClick={clearCsv}>Clear CSV</Button>
              </div>
            </div>

            {csvSummary && csvSummary.invalid > 0 && (
              <div className="rounded-[20px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                <span className="font-semibold">
                  {csvSummary.invalid} row{csvSummary.invalid !== 1 ? "s" : ""} failed validation.
                </span>
                <p className="mt-1">Fix the listed issues below, then review and select the corrected rows.</p>
                {validationIssues.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationIssues.map((issue) => (
                      <li key={issue.key}>
                        <span className="font-semibold">{issue.count} row{issue.count !== 1 ? "s" : ""}:</span>{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-[24px] border border-border">
              <table className="w-full bg-surface text-sm">
                <thead className="bg-elevated">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={(e) =>
                          setSelectedRowIndexes(e.target.checked ? new Set(validRowIndexes) : new Set())
                        }
                      />
                    </th>
                    <th className="min-w-[72px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
                      CSV row
                    </th>
                    {csvFields.map((field) => (
                      <th key={field} className="min-w-[140px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
                        {field}
                      </th>
                    ))}
                    <th className="min-w-[100px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
                      Status
                    </th>
                    <th className="min-w-[260px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
                      Issue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {csvDraft.slice((csvPage - 1) * csvPageSize, csvPage * csvPageSize).map((row, pageIndex) => {
                    const globalIndex = (csvPage - 1) * csvPageSize + pageIndex;
                    return (
                      <tr key={row.row} className={`border-t border-border ${!row.valid ? "bg-danger-soft/30" : ""}`}>
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedRowIndexes.has(globalIndex)}
                            disabled={!row.valid || row.duplicate}
                            onChange={(e) => toggleRowIndex(globalIndex, e.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-text-secondary/80">{row.row}</td>
                        {csvFields.map((field) => (
                          <td key={`${row.row}-${field}`} className="px-2 py-1.5">
                            <Input
                              className="py-1 text-xs"
                              value={row.data[field] ?? ""}
                              aria-invalid={!row.valid}
                              onChange={(event) => updateCsvCell(globalIndex, field, event.target.value)}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          <Badge tone={row.duplicate ? "warning" : row.valid ? "success" : "danger"}>
                            {row.duplicate ? "Duplicate" : row.valid ? "Ready" : "Invalid"}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-danger">
                          {!row.valid && getCsvRowErrorMessages(row.error).length > 0 ? (
                            <ul className="list-disc space-y-1 pl-4">
                              {getCsvRowErrorMessages(row.error).map((message) => <li key={message}>{message}</li>)}
                            </ul>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {csvDraft.length > csvPageSize && (
              <Pagination
                page={csvPage}
                totalPages={Math.ceil(csvDraft.length / csvPageSize)}
                onPageChange={setCsvPage}
              />
            )}

            <Button
              onClick={() => issueCsvMutation.mutate()}
              disabled={issueCsvMutation.isPending || selectedRowIndexes.size === 0}
            >
              {issueCsvMutation.isPending
                ? "Issuing..."
                : `Confirm issuance for ${selectedRowIndexes.size} of ${csvDraft.length} rows`}
            </Button>
          </div>
        ) : null}
          </>
        )}
      </Card>

      {/* Single issuance */}
      <Card className="space-y-5">
        <div>
          <p className="font-display text-2xl font-semibold text-text-primary">Single issuance</p>
          <p className="text-sm text-text-secondary">Generate one certificate using the template field schema.</p>
        </div>

        <Field label="Status">
          <Select value={singleStatus} onChange={(e) => setSingleStatus(e.target.value as IssuanceStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>

        <div className="space-y-4">
          {fields.map((field) => (
            <Field key={field.id} label={field.name} hint={`${field.type}${field.required ? " · required" : ""}`}>
              <Input
                type={inputType(field.type)}
                value={singleValues[field.name] ?? ""}
                onChange={(e) => setSingleValues((cur) => ({ ...cur, [field.name]: e.target.value }))}
              />
            </Field>
          ))}
        </div>

        <Button onClick={() => singleIssueMutation.mutate()} disabled={singleIssueMutation.isPending}>
          {singleIssueMutation.isPending ? "Issuing..." : "Create certificate"}
        </Button>
      </Card>
    </div>
  );
};
