import { FormEvent, useState } from "react";
import { Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { TemplateDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

type TemplateFormState = {
  name: string;
  category: string;
};

const initialFormState: TemplateFormState = {
  name: "",
  category: "",
};

const getCategoryLabel = (category: string | null) => category?.trim().toUpperCase() || "UNCATEGORIZED";

const getUsageLabel = (batchCount: number) => {
  if (batchCount === 0) {
    return "Not used yet";
  }

  return `Used in ${batchCount} ${batchCount === 1 ? "batch" : "batches"}`;
};

const getLastEditedLabel = (template: TemplateDto) => {
  const relativeTime = formatRelativeTime(template.updatedAt ?? template.createdAt);

  return relativeTime === null ? "Last edited unavailable" : `Last edited ${relativeTime}`;
};

export const TemplatesPage = () => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateDto | null>(null);
  const [form, setForm] = useState<TemplateFormState>(initialFormState);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<TemplateDto | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["templates", page, pageSize],
    queryFn: () => api.templates.list(page, pageSize),
  });

  useQueryErrorToast(templatesQuery.isError, templatesQuery.error, "Failed to load templates");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        return api.templates.update(editingTemplate.id, {
          name: form.name,
          category: form.category.trim() ? form.category : null,
        });
      }

      return api.templates.create({
        name: form.name,
        category: form.category.trim() ? form.category : null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      setOpen(false);
      setEditingTemplate(null);
      setForm(initialFormState);
      pushToast({ title: "Template saved", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (template: TemplateDto) => api.templates.duplicate(template.id),
    onMutate: (template) => {
      setDuplicatingTemplateId(template.id);
    },
    onSuccess: (template) => {
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      pushToast({ title: `${template.name} is ready to edit`, tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
    onSettled: () => setDuplicatingTemplateId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (template: TemplateDto) => api.templates.remove(template.id),
    onMutate: (template) => {
      setDeletingTemplateId(template.id);
    },
    onSuccess: () => {
      if ((templatesQuery.data?.items.length ?? 0) === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }

      void queryClient.invalidateQueries({ queryKey: ["templates"] });
      void queryClient.invalidateQueries({ queryKey: ["templates-all"] });
      setDeleteTemplate(null);
      pushToast({ title: "Template deleted", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
    onSettled: () => setDeletingTemplateId(null),
  });

  const openCreateModal = () => {
    setDeleteTemplate(null);
    setEditingTemplate(null);
    setForm(initialFormState);
    setOpen(true);
  };

  const openEditModal = (template: TemplateDto) => {
    setDeleteTemplate(null);
    setEditingTemplate(template);
    setForm({
      name: template.name,
      category: template.category ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleDeleteTemplate = (template: TemplateDto) => {
    setDeleteTemplate(template);
  };

  const confirmDeleteTemplate = () => {
    if (deleteTemplate === null) {
      return;
    }

    deleteMutation.mutate(deleteTemplate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Templates</p>
          <p className="text-sm text-text-secondary">Manage reusable certificate definitions and open the field/design workspace.</p>
        </div>
        <Button
          onClick={openCreateModal}
          aria-label="Create template"
          title="Create template"
        >
          <Plus className="h-4 w-4" />
          <span>Add New</span>
        </Button>
      </div>

      {templatesQuery.data?.items.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templatesQuery.data.items.map((template) => (
              <Card
                key={template.id}
                className="flex min-h-[245px] flex-col justify-between gap-7 rounded-[22px] border-border bg-surface p-6 dark:border-border dark:bg-surface/75"
              >
                <div className="space-y-7">
                  <div className="flex flex-col items-start gap-3">
                    <span
                      className="inline-flex max-w-[12rem] truncate rounded-full bg-primary-soft px-4 py-1.5 text-xs font-medium uppercase tracking-normal text-primary ring-1 ring-primary/30"
                      title={getCategoryLabel(template.category)}
                    >
                      {getCategoryLabel(template.category)}
                    </span>
                  </div>

                  <div>
                    <p className="font-display text-2xl font-semibold leading-snug text-text-primary ">{template.name}</p>
                    <p className="mt-4 flex items-center gap-3 text-base font-semibold text-text-secondary/80 ">
                      <Users size={16} className="shrink-0" />
                      <span>{getUsageLabel(template.batchCount)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
                    to={`/templates/${template.id}`}
                  >
                    Open Workspace
                  </Link>
                  <div className="flex w-full items-center gap-2">
                    <Button
                      variant="ghost"
                      className="h-[42px] flex-1 rounded-2xl bg-primary-soft p-0 text-primary ring-1 ring-primary/30 hover:bg-elevated"
                      onClick={() => openEditModal(template)}
                      aria-label={`Edit ${template.name}`}
                      title="Edit template"
                    >
                      <Pencil size={20} strokeWidth={2.4} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-[42px] flex-1 rounded-2xl bg-success-soft p-0 text-success ring-1 ring-success/30 hover:bg-elevated"
                      onClick={() => duplicateMutation.mutate(template)}
                      disabled={duplicatingTemplateId === template.id}
                      aria-label={`Duplicate ${template.name}`}
                      title={duplicatingTemplateId === template.id ? "Duplicating template" : "Duplicate template"}
                    >
                      <Copy size={20} strokeWidth={2.4} />
                    </Button>
                    <span
                      className="flex flex-1"
                      title={
                        template.batchCount > 0
                          ? "Templates used by active batches cannot be deleted"
                          : "Delete template"
                      }
                    >
                      <Button
                        variant="ghost"
                        className="h-[42px] w-full rounded-2xl bg-danger-soft p-0 text-danger ring-1 ring-danger/30 hover:bg-elevated"
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={template.batchCount > 0 || deleteMutation.isPending}
                        aria-label={`Delete ${template.name}`}
                        title={
                          deletingTemplateId === template.id
                            ? "Deleting template"
                            : "Delete template"
                        }
                      >
                        <Trash2 size={20} strokeWidth={2.4} />
                      </Button>
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text-secondary/80 dark:text-text-secondary">{getLastEditedLabel(template)}</span>
                </div>
              </Card>
            ))}
          </div>
          {templatesQuery.data.pagination.totalPages > 1 && (
            <Pagination
              page={templatesQuery.data.pagination.page}
              totalPages={templatesQuery.data.pagination.totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create the first template to start defining batch-ready credential schemas."
          action={<Button onClick={openCreateModal}>Create template</Button>}
        />
      )}

      <Modal
        open={open}
        title={editingTemplate ? "Edit template" : "Create template"}
        onClose={() => setOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Template name">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save template"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTemplate !== null}
        title="Delete template"
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTemplate(null);
          }
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-text-secondary">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text-primary">{deleteTemplate?.name}</span>? This will remove the
            template from the active templates list.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTemplate(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteTemplate}
              disabled={deleteMutation.isPending || deleteTemplate === null}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
