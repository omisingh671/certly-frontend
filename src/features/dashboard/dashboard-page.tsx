import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, GraduationCap, Layers } from "lucide-react";
import { api } from "@/api";
import type { NotificationType } from "@/api/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";
import { formatRelativeTime } from "@/lib/format";

const notificationToneByType: Record<NotificationType, "success" | "warning" | "danger" | "info"> = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "danger",
};

export const DashboardPage = () => {
  const notificationsQuery = useQuery({
    queryKey: ["notifications", "dashboard"],
    queryFn: () => api.notifications.list({ page: 1, limit: 4 }),
  });

  const batchesQuery = useQuery({
    queryKey: ["batches", 1],
    queryFn: () => api.batches.list(1, 20),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });

  useQueryErrorToast(
    batchesQuery.isError,
    batchesQuery.error,
    "Failed to load recent batches",
  );
  useQueryErrorToast(
    notificationsQuery.isError,
    notificationsQuery.error,
    "Failed to load notifications",
  );
  useQueryErrorToast(
    templatesQuery.isError,
    templatesQuery.error,
    "Failed to load templates",
  );

  const notifications = notificationsQuery.data?.items ?? [];
  const batches = batchesQuery.data?.items ?? [];
  const templates = templatesQuery.data?.items ?? [];
  const templatesTotal = templatesQuery.data?.pagination.total ?? 0;
  const usedTemplates = templates
    .filter((template) => template.batchCount > 0)
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();

      return bTime - aTime;
    });
  const recentUsedTemplates = usedTemplates.slice(0, 3);
  const templatesInUse = usedTemplates.length;

  const issuedCount = batches.reduce(
    (total, batch) => total + batch.totalCount,
    0,
  );
  const formatCertificateCount = (count: number) =>
    `${count} certificate${count === 1 ? "" : "s"}`;
  const formatBatchCount = (count: number) =>
    `${count} active ${count === 1 ? "batch" : "batches"}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Templates", value: templatesTotal, accent: "bg-accent" },
          {
            label: "Tracked batches",
            value: batches.length,
            accent: "bg-primary",
          },
          { label: "Certificates", value: issuedCount, accent: "bg-primary" },
          {
            label: "Templates in use",
            value: templatesInUse,
            accent: "bg-success",
          },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-surface">
            <div className={`mb-4 h-1.5 w-12 rounded-full ${item.accent}`} />
            <p className="text-sm font-medium text-text-secondary">
              {item.label}
            </p>
            <p className="mt-2 font-display text-4xl font-semibold text-text-primary">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-text-primary">
                Batch quick view
              </p>
              <p className="text-sm text-text-secondary">
                Recent operational cohorts and certificate volume.
              </p>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/batches">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {batchesQuery.isLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : (
              batches.slice(0, 3).map((batch) => (
                <Link
                  key={batch.id}
                  to={`/batches/${batch.id}`}
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-surface px-5 py-5 transition-colors hover:border-primary/45 hover:bg-elevated"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary ">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl font-semibold text-text-primary ">
                      {batch.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-medium text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-text-secondary " />
                        {formatCertificateCount(batch.totalCount)}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Layers className="h-4 w-4 shrink-0 text-text-secondary " />
                        <span className="shrink-0">Template:</span>
                        <span className="truncate font-semibold text-text-primary ">
                          {batch.templateName}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
                      View details
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-text-primary">
                Notifications
              </p>
              <p className="text-sm text-text-secondary">
                Latest operational messages from the backend.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-primary"
              to="/notifications"
            >
              Open panel
            </Link>
          </div>

          <div className="space-y-3">
            {notificationsQuery.isLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-[22px] bg-elevated p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold leading-6 text-text-primary">
                      {notification.message}
                    </p>
                    <Badge tone={notificationToneByType[notification.type]}>
                      {notification.type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            {!notificationsQuery.isLoading && notifications.length === 0 ? (
              <div className="rounded-[22px] bg-elevated p-4 text-sm text-text-secondary">
                No operational messages yet.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-semibold text-text-primary">
              Recently used templates
            </p>
            <p className="text-sm text-text-secondary">
              The three latest templates connected to issued batches.
            </p>
          </div>
          <Link
            className="shrink-0 text-sm font-semibold text-primary"
            to="/templates"
          >
            Manage templates
          </Link>
        </div>

        {templatesQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : recentUsedTemplates.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {recentUsedTemplates.map((template) => (
              <Link
                key={template.id}
                to={`/templates/${template.id}`}
                className="group rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/45 hover:bg-elevated"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Badge tone="info">{template.category ?? "General"}</Badge>
                </div>

                <p className="line-clamp-2 font-display text-xl font-semibold leading-snug text-text-primary">
                  {template.name}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-text-secondary">
                  <span>{formatBatchCount(template.batchCount)}</span>
                  <span className="text-xs text-text-secondary/80">
                    {formatRelativeTime(
                      template.updatedAt ?? template.createdAt ?? null,
                    ) ?? "recently"}
                  </span>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
                  Open template
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-elevated px-5 py-8 text-center">
            <p className="font-display text-lg font-semibold text-text-primary">
              No used templates yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Create a batch from a template and it will appear here.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
