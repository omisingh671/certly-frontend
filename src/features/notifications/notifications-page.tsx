import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Filter, Plus, RotateCcw, Trash2 } from "lucide-react";
import { api } from "@/api";
import type { NotificationDto, NotificationReadStatus, NotificationType } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

const notificationTypes: NotificationType[] = ["INFO", "SUCCESS", "WARNING", "ERROR"];
const readStatuses: NotificationReadStatus[] = ["all", "unread", "read"];

const toneByType: Record<NotificationType, "neutral" | "success" | "warning" | "danger" | "info"> = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "danger",
};

const statusLabel: Record<NotificationReadStatus, string> = {
  all: "All",
  unread: "Unread",
  read: "Read",
};

const NotificationRow = ({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
  isMutating,
}: {
  notification: NotificationDto;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
}) => {
  const isUnread = notification.readAt === null;

  return (
    <Card className={isUnread ? "border-primary/45 bg-primary-soft/30" : "bg-surface"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneByType[notification.type]}>{notification.type}</Badge>
            {isUnread ? <Badge tone="info">UNREAD</Badge> : <Badge tone="neutral">READ</Badge>}
          </div>
          <p className="mt-3 break-words font-semibold text-text-primary">{notification.message}</p>
          <p className="mt-2 text-sm text-text-secondary">{formatDateTime(notification.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {isUnread ? (
            <Button variant="success-outline" onClick={() => onMarkRead(notification.id)} disabled={isMutating}>
              <Check className="h-4 w-4" />
              <span>Mark read</span>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onMarkUnread(notification.id)} disabled={isMutating}>
              <RotateCcw className="h-4 w-4" />
              <span>Unread</span>
            </Button>
          )}
          <Button variant="danger-outline" onClick={() => onDelete(notification.id)} disabled={isMutating}>
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<NotificationReadStatus>("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [createType, setCreateType] = useState<NotificationType>("INFO");

  const notificationsQuery = useQuery({
    queryKey: ["notifications", page, pageSize, status, type],
    queryFn: () =>
      api.notifications.list({
        page,
        limit: pageSize,
        status,
        type: type === "all" ? undefined : type,
      }),
  });

  useQueryErrorToast(notificationsQuery.isError, notificationsQuery.error, "Failed to load notifications");

  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.notifications.create({ message, type: createType }),
    onSuccess: () => {
      invalidateNotifications();
      setCreateOpen(false);
      setMessage("");
      setCreateType("INFO");
      pushToast({ title: "Notification created", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: invalidateNotifications,
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markUnread(id),
    onSuccess: invalidateNotifications,
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: (result) => {
      invalidateNotifications();
      pushToast({ title: `${result.updated} notification${result.updated === 1 ? "" : "s"} marked read`, tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.notifications.remove(id),
    onSuccess: () => {
      invalidateNotifications();
      pushToast({ title: "Notification deleted", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const resetFilters = () => {
    setStatus("all");
    setType("all");
    setPage(1);
  };

  const notifications = notificationsQuery.data?.items ?? [];
  const pagination = notificationsQuery.data?.pagination;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const filtersActive = status !== "all" || type !== "all";
  const rowMutationPending =
    markReadMutation.isPending || markUnreadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Notifications</p>
          <p className="text-sm text-text-secondary">{unreadCount} unread operational message{unreadCount === 1 ? "" : "s"}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => markAllReadMutation.mutate()} disabled={unreadCount === 0 || markAllReadMutation.isPending}>
            <CheckCheck className="h-4 w-4" />
            <span>Mark all read</span>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      <Card className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Status">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as NotificationReadStatus);
              setPage(1);
            }}
          >
            {readStatuses.map((item) => (
              <option key={item} value={item}>
                {statusLabel[item]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value as NotificationType | "all");
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {notificationTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant={filtersActive ? "info-outline" : "secondary"} onClick={resetFilters} disabled={!filtersActive}>
          <Filter className="h-4 w-4" />
          <span>Reset</span>
        </Button>
      </Card>

      {notificationsQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : notifications.length ? (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onMarkUnread={(id) => markUnreadMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isMutating={rowMutationPending}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={filtersActive ? "No notifications match these filters" : "No notifications"}
          description={
            filtersActive
              ? "Reset filters to see more operational messages."
              : "Operational messages will appear here when batches, certificates, and PDF jobs run."
          }
          action={filtersActive ? <Button variant="secondary" onClick={resetFilters}>Reset filters</Button> : null}
        />
      )}

      {(pagination?.totalPages ?? 0) > 1 ? (
        <Pagination
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? 1}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}

      <Modal open={createOpen} title="Create notification" onClose={() => setCreateOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Field label="Type">
            <Select value={createType} onChange={(event) => setCreateType(event.target.value as NotificationType)}>
              {notificationTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Message">
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || message.trim().length === 0}>
              <Bell className="h-4 w-4" />
              <span>{createMutation.isPending ? "Creating..." : "Create notification"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
