import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ClientsTab } from "./components/clients-tab";
import { MappingsTab } from "./components/mappings-tab";
import { SyncLogsTab } from "./components/sync-logs-tab";

type TabValue = "clients" | "mappings" | "logs";

export const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("clients");

  // Callbacks/triggers to connect the main page header button to subcomponent modal states
  const [addClientTrigger, setAddClientTrigger] = useState<(() => void) | null>(null);
  const [addMappingTrigger, setAddMappingTrigger] = useState<(() => void) | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Integrations</p>
          <p className="text-sm text-text-secondary">
            Connect external LMS systems directly to Certly's issuance batches and verification flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            items={[
              { value: "clients", label: "LMS Clients" },
              { value: "mappings", label: "Batch Mappings" },
              { value: "logs", label: "Sync Logs" },
            ]}
            value={activeTab}
            onChange={(tab) => setActiveTab(tab as TabValue)}
          />
          {activeTab === "clients" && addClientTrigger && (
            <Button onClick={addClientTrigger}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add Client</span>
            </Button>
          )}
          {activeTab === "mappings" && addMappingTrigger && (
            <Button onClick={addMappingTrigger}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add Mapping</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "clients" && (
        <ClientsTab onAddClientTrigger={setAddClientTrigger} />
      )}
      {activeTab === "mappings" && (
        <MappingsTab onAddMappingTrigger={setAddMappingTrigger} />
      )}
      {activeTab === "logs" && (
        <SyncLogsTab />
      )}
    </div>
  );
};
