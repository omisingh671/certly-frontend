import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText, Filter, GraduationCap, Layers, Plus, X } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

export const BatchesPage = () => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [createTemplateId, setCreateTemplateId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");

  const batchesQuery = useQuery({
    queryKey: ["batches", page, pageSize, categoryFilter, templateFilter],
    queryFn: () =>
      api.batches.list(page, pageSize, {
        category: categoryFilter === "all" ? undefined : categoryFilter,
        templateId: templateFilter === "all" ? undefined : templateFilter,
      }),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(1, 100),
  });

  useQueryErrorToast(batchesQuery.isError, batchesQuery.error, "Failed to load batches");

  const createMutation = useMutation({
    mutationFn: () => api.batches.create({ name, templateId: createTemplateId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
      setOpen(false);
      setName("");
      setCreateTemplateId("");
      pushToast({ title: "Batch created", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const batches = batchesQuery.data?.items ?? [];
  const formatCertificateCount = (count: number) => `${count} certificate${count === 1 ? "" : "s"}`;
  const templates = templatesQuery.data?.items ?? [];
  const categoryOptions = [...new Set(templates.map((template) => template.category).filter((category): category is string => Boolean(category)))];
  const filtersActive = categoryFilter !== "all" || templateFilter !== "all";

  const resetFilters = () => {
    setCategoryFilter("all");
    setTemplateFilter("all");
    setPage(1);
  };

  const setFilterAndResetPage = (callback: () => void) => {
    callback();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Batches</p>
          <p className="text-sm text-text-secondary">Track issuance cohorts with quick access to certificates and issuance flows.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={filtersActive ? "info-outline" : "secondary"}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Add New</span>
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <Card className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Category">
            <Select
              value={categoryFilter}
              onChange={(event) => setFilterAndResetPage(() => setCategoryFilter(event.target.value))}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Template">
            <Select
              value={templateFilter}
              onChange={(event) => setFilterAndResetPage(() => setTemplateFilter(event.target.value))}
            >
              <option value="all">All templates</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="secondary" onClick={resetFilters} disabled={!filtersActive}>
            <X className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        </Card>
      )}

      {batches.length ? (
        <>
          <Card className="rounded-[30px] p-6 shadow-panel">
            <div className="mb-5">
              <p className="font-display text-2xl font-semibold text-text-primary ">Batch quick view</p>
              <p className="text-sm text-text-secondary ">
                Recent operational cohorts and certificate volume.
              </p>
            </div>
            <div className="space-y-4">
            {batches.map((batch) => (
              <Link
                key={batch.id}
                to={`/batches/${batch.id}`}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-[22px] border border-border bg-surface px-5 py-5 transition-colors hover:border-primary/45 hover:bg-elevated min-w-0"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary ">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl font-semibold text-text-primary ">{batch.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-text-secondary w-full min-w-0">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-text-secondary " />
                        {formatCertificateCount(batch.totalCount)}
                      </span>
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                        <Layers className="h-4 w-4 shrink-0 text-text-secondary " />
                        <span className="shrink-0">Template:</span>
                        <span className="truncate font-semibold text-text-primary ">{batch.templateName}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-start sm:justify-end gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover pl-16 sm:pl-0">
                  <span>View details</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
            </div>
          </Card>
          {(batchesQuery.data?.pagination.totalPages ?? 1) > 1 && (
            <Pagination
              page={batchesQuery.data?.pagination.page ?? 1}
              totalPages={batchesQuery.data?.pagination.totalPages ?? 1}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      ) : (
        <EmptyState
          title={filtersActive ? "No batches match these filters" : "No batches created"}
          description={
            filtersActive
              ? "Clear or adjust filters to see more batches."
              : "Create a batch once a template is ready, then issue certificates manually or from CSV."
          }
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={resetFilters}>Clear filters</Button>
            ) : (
              <Button onClick={() => setOpen(true)}>Create batch</Button>
            )
          }
        />
      )}

      <Modal open={open} title="Create batch" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Batch name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Template">
            <Select value={createTemplateId} onChange={(event) => setCreateTemplateId(event.target.value)}>
              <option value="">Select a template</option>
              {templatesQuery.data?.items.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create batch"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
