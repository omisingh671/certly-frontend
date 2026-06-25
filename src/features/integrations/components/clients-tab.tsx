import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";
import { ApiKeyModal } from "./api-key-modal";

interface ClientsTabProps {
  onAddClientTrigger?: (trigger: () => void) => void;
}

export const ClientsTab = ({ onAddClientTrigger }: ClientsTabProps) => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [clientsPage, setClientsPage] = useState(1);
  const pageSize = 10;

  // Add Client Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("LMS");

  // One-time API Key modal
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [oneTimeApiKey, setOneTimeApiKey] = useState("");
  const [oneTimeClientName, setOneTimeClientName] = useState("");

  // Register parent trigger for "+ Add Client" button in header
  useEffect(() => {
    if (onAddClientTrigger) {
      onAddClientTrigger(() => () => setClientModalOpen(true));
    }
  }, [onAddClientTrigger]);

  const clientsQuery = useQuery({
    queryKey: ["integration-clients", clientsPage, pageSize],
    queryFn: () => api.integrations.clients.list(clientsPage, pageSize),
  });

  useQueryErrorToast(clientsQuery.isError, clientsQuery.error, "Failed to load LMS clients");

  const createClientMutation = useMutation({
    mutationFn: () => api.integrations.clients.create({ name: clientName, type: clientType as "LMS" }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["integration-clients"] });
      void queryClient.invalidateQueries({ queryKey: ["integration-clients-dropdown"] });
      setClientModalOpen(false);
      setClientName("");
      setOneTimeApiKey(data.apiKey);
      setOneTimeClientName(data.client.name);
      setApiKeyModalOpen(true);
      pushToast({ title: "LMS client created successfully", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const toggleClientMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.integrations.clients.update(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integration-clients"] });
      void queryClient.invalidateQueries({ queryKey: ["integration-clients-dropdown"] });
      pushToast({ title: "Client status updated", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: (id: string) => api.integrations.clients.regenerateKey(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["integration-clients"] });
      setOneTimeApiKey(data.apiKey);
      setOneTimeClientName(data.client.name);
      setApiKeyModalOpen(true);
      pushToast({ title: "API key regenerated successfully", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleClientSubmit = (e: FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate();
  };

  const allClients = clientsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      {allClients.length === 0 ? (
        <EmptyState
          title="No LMS Clients Found"
          description="Integrate your LMS platform by creating a secure client API key client first."
          action={
            <Button onClick={() => setClientModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create LMS Client
            </Button>
          }
        />
      ) : (
        <>
          {/* Client Header Card */}
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold text-text-primary">Integration Clients</p>
              <p className="text-sm text-text-secondary">
                These clients can authenticate using API keys to request certificate issuance.
              </p>
            </div>
            <Button onClick={() => setClientModalOpen(true)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Create Client
            </Button>
          </Card>

          {/* Client Table Card */}
          <Card className="rounded-[30px] p-6 shadow-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary font-medium">
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">API Key Suffix</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4">Created Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allClients.map((client) => (
                    <tr key={client.id} className="border-b border-border hover:bg-elevated/40">
                      <td className="py-3.5 px-4 font-semibold text-text-primary">{client.name}</td>
                      <td className="py-3.5 px-4">
                        <Badge tone="info">{client.type}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">••••••••{client.apiKeyLast4}</td>
                      <td className="py-3.5 px-4">
                        <Toggle
                          checked={client.active}
                          onChange={() =>
                            toggleClientMutation.mutate({ id: client.id, active: !client.active })
                          }
                        />
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {formatDateTime(client.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => regenerateKeyMutation.mutate(client.id)}
                          disabled={regenerateKeyMutation.isPending}
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Regenerate Key
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <Pagination
                page={clientsPage}
                totalPages={clientsQuery.data?.pagination.totalPages ?? 1}
                onPageChange={setClientsPage}
              />
            </div>
          </Card>
        </>
      )}

      {/* Create Client Modal */}
      <Modal open={clientModalOpen} title="Add LMS Integration Client" onClose={() => setClientModalOpen(false)}>
        <form onSubmit={handleClientSubmit} className="space-y-5">
          <Field label="Integration Client Name">
            <Input
              required
              placeholder="e.g. Moodle LMS Production"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </Field>
          <Field label="System Type">
            <Select value={clientType} onChange={(e) => setClientType(e.target.value)}>
              <option value="LMS">LMS (Learning Management System)</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setClientModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createClientMutation.isPending}>
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* One-time API Key Modal */}
      <ApiKeyModal
        open={apiKeyModalOpen}
        onClose={() => {
          setApiKeyModalOpen(false);
          setOneTimeApiKey("");
        }}
        clientName={oneTimeClientName}
        apiKey={oneTimeApiKey}
      />
    </div>
  );
};
