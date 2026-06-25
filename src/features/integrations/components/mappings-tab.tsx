import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Trash2 } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

export const MappingsTab = () => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [mappingsPage, setMappingsPage] = useState(1);
  const pageSize = 10;
  const [mappingsClientFilter, setMappingsClientFilter] = useState("all");

  // Create Mapping Modal
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingClientId, setMappingClientId] = useState("");
  const [mappingExtCourseId, setMappingExtCourseId] = useState("");
  const [mappingExtCourseName, setMappingExtCourseName] = useState("");
  const [mappingExtCourseType, setMappingExtCourseType] = useState("");
  const [mappingExtGroupId, setMappingExtGroupId] = useState("");
  const [mappingExtGroupName, setMappingExtGroupName] = useState("");
  const [mappingBatchId, setMappingBatchId] = useState("");

  // Load clients for the dropdown filters (non-paginated or max limit 100)
  const clientsListQuery = useQuery({
    queryKey: ["integration-clients-dropdown"],
    queryFn: () => api.integrations.clients.list(1, 100),
  });
  const allClients = clientsListQuery.data?.items ?? [];

  // Mappings Query
  const mappingsQuery = useQuery({
    queryKey: ["integration-mappings", mappingsPage, pageSize, mappingsClientFilter],
    queryFn: () =>
      api.integrations.mappings.list(
        mappingsPage,
        pageSize,
        mappingsClientFilter === "all" ? undefined : mappingsClientFilter,
      ),
  });

  // Load all batches for mapping dropdown
  const batchesQuery = useQuery({
    queryKey: ["batches-all-for-mapping"],
    queryFn: () => api.batches.list(1, 100),
    enabled: mappingModalOpen,
  });
  const allBatches = batchesQuery.data?.items ?? [];

  useQueryErrorToast(mappingsQuery.isError, mappingsQuery.error, "Failed to load batch mappings");

  const createMappingMutation = useMutation({
    mutationFn: () =>
      api.integrations.mappings.create({
        clientId: mappingClientId,
        externalCourseId: mappingExtCourseId,
        externalCourseName: mappingExtCourseName,
        externalCourseType: mappingExtCourseType || null,
        externalGroupId: mappingExtGroupId || null,
        externalGroupName: mappingExtGroupName || null,
        batchId: mappingBatchId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integration-mappings"] });
      setMappingModalOpen(false);
      setMappingClientId("");
      setMappingExtCourseId("");
      setMappingExtCourseName("");
      setMappingExtCourseType("");
      setMappingExtGroupId("");
      setMappingExtGroupName("");
      setMappingBatchId("");
      pushToast({ title: "Mapping created successfully", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const toggleMappingMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.integrations.mappings.update(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integration-mappings"] });
      pushToast({ title: "Mapping status updated", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: string) => api.integrations.mappings.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integration-mappings"] });
      pushToast({ title: "Mapping soft-deleted", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleMappingSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMappingMutation.mutate();
  };

  const selectedBatchObj = allBatches.find((b) => b.id === mappingBatchId);

  return (
    <div className="space-y-4">
      {/* Mapping filters */}
      <Card className="flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="w-64">
          <Field label="Filter by LMS Client">
            <Select
              value={mappingsClientFilter}
              onChange={(e) => {
                setMappingsClientFilter(e.target.value);
                setMappingsPage(1);
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
        </div>
        <Button onClick={() => setMappingModalOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Mapping</span>
        </Button>
      </Card>

      {/* Mappings Table */}
      {(mappingsQuery.data?.items ?? []).length === 0 ? (
        <EmptyState
          title="No Batch Mappings Defined"
          description="Configure batch mappings to resolve external courses/groups to Certly certificate batches."
          action={
            <Button onClick={() => setMappingModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Batch Mapping
            </Button>
          }
        />
      ) : (
        <Card className="rounded-[30px] p-6 shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-medium">
                  <th className="py-3 px-4">LMS Course ID</th>
                  <th className="py-3 px-4">LMS Course Name</th>
                  <th className="py-3 px-4">LMS Group/Cohort</th>
                  <th className="py-3 px-4">Mapped Certly Batch</th>
                  <th className="py-3 px-4">Batch Template</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {(mappingsQuery.data?.items ?? []).map((mapping) => (
                  <tr key={mapping.id} className="border-b border-border hover:bg-elevated/40">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      {mapping.externalCourseId}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">{mapping.externalCourseName}</td>
                    <td className="py-3.5 px-4">
                      {mapping.externalGroupId ? (
                        <span className="text-text-primary">
                          {mapping.externalGroupName || mapping.externalGroupId}
                          <p className="text-[10px] text-text-secondary font-mono">
                            ID: {mapping.externalGroupId}
                          </p>
                        </span>
                      ) : (
                        <span className="text-text-secondary italic text-xs">Self-paced (Default)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-primary">
                      {mapping.batchName || mapping.batchId}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {mapping.templateName || "Unknown"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Toggle
                        checked={mapping.active}
                        onChange={() =>
                          toggleMappingMutation.mutate({ id: mapping.id, active: !mapping.active })
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this batch mapping?")) {
                            deleteMappingMutation.mutate(mapping.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Pagination
              page={mappingsPage}
              totalPages={mappingsQuery.data?.pagination.totalPages ?? 1}
              onPageChange={setMappingsPage}
            />
          </div>
        </Card>
      )}

      {/* Create Mapping Modal */}
      <Modal open={mappingModalOpen} title="Add LMS Batch Mapping" onClose={() => setMappingModalOpen(false)}>
        <form onSubmit={handleMappingSubmit} className="space-y-4">
          <Field label="LMS Integration Client (Sender)">
            <Select required value={mappingClientId} onChange={(e) => setMappingClientId(e.target.value)}>
              <option value="">Select integration client...</option>
              {allClients
                .filter((c) => c.active)
                .map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="LMS Course ID (externalCourseId)">
              <Input
                required
                placeholder="e.g. COURSE-101"
                value={mappingExtCourseId}
                onChange={(e) => setMappingExtCourseId(e.target.value)}
              />
            </Field>
            <Field label="LMS Course Name">
              <Input
                required
                placeholder="e.g. Cyber Security Basics"
                value={mappingExtCourseName}
                onChange={(e) => setMappingExtCourseName(e.target.value)}
              />
            </Field>
          </div>

          <Field label="External Course Type (Optional)">
            <Input
              placeholder="e.g. SELF_PACED_COURSE"
              value={mappingExtCourseType}
              onChange={(e) => setMappingExtCourseType(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="LMS Group ID (externalGroupId) - Optional">
              <Input
                placeholder="e.g. COHORT-JULY-2026"
                value={mappingExtGroupId}
                onChange={(e) => setMappingExtGroupId(e.target.value)}
              />
            </Field>
            <Field label="LMS Group Name - Optional">
              <Input
                placeholder="e.g. July 2026 Cohort"
                value={mappingExtGroupName}
                onChange={(e) => setMappingExtGroupName(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Certly Destination Batch">
            <Select required value={mappingBatchId} onChange={(e) => setMappingBatchId(e.target.value)}>
              <option value="">Select batch...</option>
              {allBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} (Template: {batch.templateName})
                </option>
              ))}
            </Select>
          </Field>

          {selectedBatchObj && (
            <div className="text-xs rounded-xl bg-elevated border border-border p-3 flex gap-2">
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-text-primary">Selected Destination:</span> Maps to batch{" "}
                <strong>{selectedBatchObj.name}</strong>, utilizing the template{" "}
                <strong>{selectedBatchObj.templateName}</strong>.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setMappingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMappingMutation.isPending}>
              {createMappingMutation.isPending ? "Creating..." : "Add Mapping"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
