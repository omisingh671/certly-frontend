import { useState } from "react";
import { FolderArchive, Layers, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { BatchDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";

export const BatchOverviewTab = ({
  batchId,
  batch,
}: {
  batchId: string;
  batch: BatchDto | undefined;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [templateValue, setTemplateValue] = useState("");
  const [deleteBatchConfirm, setDeleteBatchConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["templates", "batch-template-options"],
    queryFn: () => api.templates.list(1, 100),
    enabled: templateOpen,
  });

  const renameBatchMutation = useMutation({
    mutationFn: () => api.batches.update(batchId, { name: nameValue }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
      setRenameOpen(false);
      pushToast({ title: "Batch renamed", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const changeTemplateMutation = useMutation({
    mutationFn: () => api.batches.update(batchId, { templateId: templateValue }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
      void queryClient.invalidateQueries({ queryKey: ["template-fields-for-batch", batchId] });
      setTemplateOpen(false);
      pushToast({ title: "Batch template changed", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: () => api.batches.remove(batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
      pushToast({ title: "Batch deleted", tone: "success" });
      navigate("/batches");
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const certificatesQuery = useQuery({
    queryKey: ["batch-certificates", batchId],
    queryFn: () => api.batches.certificates(batchId),
  });

  const statusCounts = {
    ISSUED: 0,
    PENDING: 0,
    REVOKED: 0,
    REJECTED: 0,
    ...(certificatesQuery.data ?? []).reduce<Record<string, number>>((acc, cert) => {
      acc[cert.status] = (acc[cert.status] ?? 0) + 1;
      return acc;
    }, {}),
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await api.batches.downloadCertificatesZip(batchId, batch?.slug ?? batchId);
    } catch (error) {
      pushToast({ title: (error as Error).message, tone: "error" });
    } finally {
      setIsDownloading(false);
    }
  };

  const canChangeTemplate = (batch?.totalCount ?? 0) === 0;
  const changeTemplateTitle = canChangeTemplate
    ? undefined
    : "Delete all certificates before changing the template";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-text-secondary">Total certificates</p>
          <p className="mt-3 font-display text-4xl font-semibold text-text-primary">{batch?.totalCount ?? 0}</p>
          {certificatesQuery.data && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
              {statusCounts.ISSUED > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {statusCounts.ISSUED} Issued
                </span>
              )}
              {statusCounts.PENDING > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-warning">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  {statusCounts.PENDING} Pending
                </span>
              )}
              {statusCounts.REVOKED > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-text-secondary/65" />
                  {statusCounts.REVOKED} Revoked
                </span>
              )}
              {statusCounts.REJECTED > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-danger">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  {statusCounts.REJECTED} Rejected
                </span>
              )}
            </div>
          )}
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Updated</p>
          <p className="mt-3 font-semibold text-text-primary">
            {formatDateTime(batch?.updatedAt ?? batch?.createdAt)}
          </p>
        </Card>
      </div>

      <Card>
        <p className="font-display text-lg font-semibold text-text-primary">Batch actions</p>
        <p className="mt-1 text-sm text-text-secondary">
          Rename this batch, switch its template while empty, or delete it if no certificates have been issued yet.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="neutral-outline"
            onClick={() => { setNameValue(batch?.name ?? ""); setRenameOpen(true); }}
          >
            <Pencil size={15} />
            Rename batch
          </Button>
          <span className="inline-flex" title={changeTemplateTitle}>
            <Button
              variant="neutral-outline"
              disabled={!batch || !canChangeTemplate || changeTemplateMutation.isPending}
              onClick={() => {
                setTemplateValue(batch?.templateId ?? "");
                setTemplateOpen(true);
              }}
            >
              <Layers size={15} />
              Change template
            </Button>
          </span>
          <Button
            variant="info-outline"
            onClick={() => void handleDownloadZip()}
            disabled={isDownloading || (batch?.totalCount ?? 0) === 0}
          >
            <FolderArchive size={15} />
            {isDownloading ? "Downloading..." : "Download Certificates ZIP"}
          </Button>
          <Button
            variant="danger-outline"
            disabled={(batch?.totalCount ?? 0) > 0 || deleteBatchMutation.isPending}
            title={(batch?.totalCount ?? 0) > 0 ? "Delete all certificates before deleting the batch" : undefined}
            onClick={() => {
              if (deleteBatchConfirm) deleteBatchMutation.mutate();
              else setDeleteBatchConfirm(true);
            }}
          >
            <Trash2 size={15} />
            {deleteBatchMutation.isPending
              ? "Deleting..."
              : deleteBatchConfirm
                ? "Confirm delete?"
                : "Delete batch"}
          </Button>
        </div>
      </Card>

      <Modal open={renameOpen} title="Rename batch" onClose={() => setRenameOpen(false)}>
        <div className="space-y-4">
          <Field label="Batch name">
            <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => renameBatchMutation.mutate()} disabled={renameBatchMutation.isPending}>
              {renameBatchMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={templateOpen} title="Change template" onClose={() => setTemplateOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-text-secondary">
            Template changes are available only before certificates are added to the batch.
          </p>
          <Field label="Template">
            <Select
              value={templateValue}
              onChange={(event) => setTemplateValue(event.target.value)}
              disabled={templatesQuery.isLoading || changeTemplateMutation.isPending}
            >
              <option value="">{templatesQuery.isLoading ? "Loading templates..." : "Select a template"}</option>
              {templatesQuery.data?.items.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => changeTemplateMutation.mutate()}
              disabled={
                changeTemplateMutation.isPending ||
                !templateValue ||
                templateValue === batch?.templateId
              }
            >
              {changeTemplateMutation.isPending ? "Saving..." : "Save template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
