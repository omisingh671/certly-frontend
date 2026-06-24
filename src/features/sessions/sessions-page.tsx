import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { api } from "@/api";
import type { SessionDto } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

const columnHelper = createColumnHelper<SessionDto>();

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const SessionsPage = () => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionDto | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: ["sessions", page, pageSize],
    queryFn: () => api.sessions.list(page, pageSize),
  });

  useQueryErrorToast(
    sessionsQuery.isError,
    sessionsQuery.error,
    "Failed to load active sessions",
  );

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => api.sessions.revoke(sessionId),
    onSuccess: () => {
      setSessionToRevoke(null);
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      pushToast({ title: "Session revoked", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => api.sessions.revokeAll(),
    onSuccess: ({ revoked }) => {
      setRevokeAllOpen(false);
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      pushToast({
        title: revoked === 1 ? "1 session revoked" : `${revoked} sessions revoked`,
        tone: "success",
      });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor((session) => session.user.name ?? session.user.email, {
        id: "user",
        header: "User",
        cell: (info) => (
          <div>
            <p className="font-medium text-text-primary">{info.getValue()}</p>
            <p className="text-xs text-text-secondary">{info.row.original.user.email}</p>
          </div>
        ),
      }),
      columnHelper.accessor((session) => session.user.role, {
        id: "role",
        header: "Role",
      }),
      columnHelper.accessor("createdAt", {
        header: "Signed in",
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor("expiresAt", {
        header: "Expires",
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor("isCurrent", {
        header: "Session",
        cell: (info) =>
          info.getValue() ? <Badge tone="success">Current</Badge> : <Badge>Active</Badge>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <div className="flex justify-end">
            <Button
              variant="danger-outline"
              disabled={info.row.original.isCurrent}
              onClick={() => setSessionToRevoke(info.row.original)}
            >
              Revoke
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Sessions</p>
          <p className="text-sm text-text-secondary">
            Review active staff sessions and revoke access immediately.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setRevokeAllOpen(true)}
          disabled={(sessionsQuery.data?.pagination.total ?? 0) <= 1}
        >
          Revoke all
        </Button>
      </div>

      <Card className="space-y-4">
        <DataTable
          data={sessionsQuery.data?.items ?? []}
          columns={columns}
          searchPlaceholder="Filter sessions"
        />
        {(sessionsQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <Pagination
            page={sessionsQuery.data?.pagination.page ?? 1}
            totalPages={sessionsQuery.data?.pagination.totalPages ?? 1}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </Card>

      <Modal
        open={sessionToRevoke !== null}
        title="Revoke session?"
        closeDisabled={revokeMutation.isPending}
        onClose={() => {
          if (!revokeMutation.isPending) setSessionToRevoke(null);
        }}
      >
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            This will immediately sign out{" "}
            <span className="font-semibold text-text-primary">
              {sessionToRevoke?.user.name ?? sessionToRevoke?.user.email}
            </span>{" "}
            from this session.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={revokeMutation.isPending}
              onClick={() => setSessionToRevoke(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={revokeMutation.isPending || sessionToRevoke === null}
              onClick={() => {
                if (sessionToRevoke) revokeMutation.mutate(sessionToRevoke.id);
              }}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke session"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={revokeAllOpen}
        title="Revoke all other sessions?"
        closeDisabled={revokeAllMutation.isPending}
        onClose={() => {
          if (!revokeAllMutation.isPending) setRevokeAllOpen(false);
        }}
      >
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            Every active session except your current session will be revoked immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={revokeAllMutation.isPending}
              onClick={() => setRevokeAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={revokeAllMutation.isPending}
              onClick={() => revokeAllMutation.mutate()}
            >
              {revokeAllMutation.isPending ? "Revoking..." : "Revoke all sessions"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
