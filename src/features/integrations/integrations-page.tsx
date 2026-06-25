import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { ClientsTab } from "./components/clients-tab";
import { MappingsTab } from "./components/mappings-tab";
import { SyncLogsTab } from "./components/sync-logs-tab";

type TabValue = "clients" | "mappings" | "logs";

export const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("clients");

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
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "clients" && (
        <ClientsTab />
      )}
      {activeTab === "mappings" && (
        <MappingsTab />
      )}
      {activeTab === "logs" && (
        <SyncLogsTab />
      )}
    </div>
  );
};
