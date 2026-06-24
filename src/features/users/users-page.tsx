import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import type { UserDto } from "@/api/types";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { useQueryErrorToast } from "@/lib/use-query-error-toast";

const columnHelper = createColumnHelper<UserDto>();

export const UsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; password: string }>({
    name: "", email: "", password: "",
  });

  const usersQuery = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => api.users.list(page, pageSize),
  });

  useQueryErrorToast(usersQuery.isError, usersQuery.error, "Failed to load users");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        return api.users.update(editingUser.id, {
          name: form.name.trim() || undefined,
          email: form.email,
          password: form.password || undefined,
        });
      }

      return api.users.create({ name: form.name.trim() || undefined, email: form.email, password: form.password });
    },
    onSuccess: () => {
      const changedOwnPassword =
        editingUser?.id === currentUser?.id && form.password.length > 0;

      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditingUser(null);
      setForm({ name: "", email: "", password: "" });

      if (changedOwnPassword) {
        clearSession();
        pushToast({ title: "Password updated. Sign in again.", tone: "success" });
        navigate("/login");
        return;
      }

      pushToast({ title: editingUser ? "Account updated" : "Admin account created", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => api.users.remove(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      pushToast({ title: "Account deactivated", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => api.users.reactivate(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      pushToast({ title: "Account enabled", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "" });
    setOpen(true);
  };

  const openEdit = (user: UserDto) => {
    setEditingUser(user);
    setForm({ name: user.name ?? "", email: user.email, password: "" });
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

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => (
        <span className={info.row.original.isActive ? "" : "opacity-40"}>
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => (
        <span className={info.row.original.isActive ? "" : "opacity-40"}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (info) => (
        <span className={info.row.original.isActive ? "" : "opacity-40"}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: (info) =>
        info.getValue() ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="neutral">Inactive</Badge>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const user = info.row.original;
        const isSelf = currentUser?.id === user.id;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => openEdit(user)}
              disabled={!user.isActive}
            >
              Edit
            </Button>
            <Toggle
              checked={user.isActive}
              disabled={isSelf || deactivateMutation.isPending || reactivateMutation.isPending}
              onChange={() =>
                user.isActive
                  ? deactivateMutation.mutate(user.id)
                  : reactivateMutation.mutate(user.id)
              }
            />
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-3xl font-semibold text-text-primary">Users</p>
          <p className="text-sm text-text-secondary">Super Admin-only staff management for admin accounts and email changes.</p>
        </div>
        <Button onClick={openCreate}>Create admin</Button>
      </div>

      <Card className="space-y-4">
        <DataTable data={usersQuery.data?.items ?? []} columns={columns} searchPlaceholder="Filter users" />
        {(usersQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <Pagination
            page={usersQuery.data?.pagination.page ?? 1}
            totalPages={usersQuery.data?.pagination.totalPages ?? 1}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </Card>

      <Modal open={open} title={editingUser ? "Edit admin" : "Create admin"} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Name" hint="Optional">
            <Input
              value={form.name}
              placeholder="Full name"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </Field>
          <Field label={editingUser ? "Password (leave blank to keep current)" : "Password"}>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingUser ? "Save changes" : "Create admin"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
