import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";
import { BatchOverviewTab } from "./components/batch-overview-tab";
import { BatchCertificatesTab } from "./components/batch-certificates-tab";
import { BatchIssuanceTab } from "./components/batch-issuance-tab";

export const BatchDetailPage = () => {
  const { batchId = "" } = useParams();
  const [activeTab, setActiveTab] = useState<"overview" | "certificates" | "issuance">("overview");

  const batchQuery = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.batches.get(batchId),
  });

  const fieldsQuery = useQuery({
    queryKey: ["template-fields-for-batch", batchId, batchQuery.data?.templateId],
    enabled: Boolean(batchQuery.data?.templateId),
    queryFn: () => api.templates.fields(batchQuery.data!.templateId),
  });

  useQueryErrorToast(batchQuery.isError, batchQuery.error, "Failed to load batch");

  const batch = batchQuery.data;
  const fields = fieldsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-3xl font-semibold text-text-primary">
              {batch?.name ?? "Loading batch..."}
            </p>
            <div>
              <p className="mt-2 text-sm text-text-secondary">
                <span className="font-medium text-text-secondary">Using template:</span>{" "}
                <span className="font-semibold text-text-primary">
                  {batch?.templateName ?? batch?.templateId ?? "Loading..."}
                </span>
              </p>
            </div>
          </div>
          <Tabs
            items={[
              { value: "overview", label: "Overview" },
              { value: "certificates", label: "Certificates" },
              { value: "issuance", label: "Issuance" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </Card>

      {activeTab === "overview" && <BatchOverviewTab batchId={batchId} batch={batch} />}
      {activeTab === "certificates" && <BatchCertificatesTab batchId={batchId} fields={fields} />}
      {activeTab === "issuance" && (
        <BatchIssuanceTab
          batchId={batchId}
          fields={fields}
          onViewCertificates={() => setActiveTab("certificates")}
        />
      )}
    </div>
  );
};
