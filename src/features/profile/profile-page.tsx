import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { resolveAssetUrl } from "@/lib/asset-url";

const getInitials = (name: string | null, email: string) => {
  if (name) return name.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { pushToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    password: "",
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; password?: string }) => api.auth.updateMe(input),
    onSuccess: (updated, input) => {
      if (input.password !== undefined) {
        clearSession();
        pushToast({ title: "Password updated. Sign in again.", tone: "success" });
        navigate("/login");
        return;
      }

      setSession(updated, accessToken!);
      setForm((f) => ({ ...f, password: "" }));
      pushToast({ title: "Profile updated", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const logoMutation = useMutation({
    mutationFn: () => api.auth.uploadLogo(selectedFile!),
    onSuccess: (updated) => {
      setSession(updated, accessToken!);
      setPreview(null);
      setSelectedFile(null);
      pushToast({ title: "Logo updated", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateMutation.mutate({
      name: form.name.trim() || undefined,
      password: form.password || undefined,
    });
  };

  const currentLogoUrl = resolveAssetUrl(user?.logoUrl);
  const displayLogo = preview ?? currentLogoUrl;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-3xl font-semibold text-text-primary">
          Profile
        </p>
        <p className="text-sm text-text-secondary">
          Update your name, password, and logo. Email changes are handled by the
          Super Admin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Name">
              <Input
                value={form.name}
                placeholder="Your name"
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </Field>
            <Field
              label="Email"
              hint="Email changes must be completed by the Super Admin in the Users module."
            >
              <Input type="email" value={user?.email ?? ""} disabled />
            </Field>
            <Field
              label="New password"
              hint="Leave blank to keep current password"
            >
              <Input
                type="password"
                value={form.password}
                placeholder="••••••••"
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col items-center gap-4 min-w-80">
          {displayLogo ? (
            <img
              src={displayLogo}
              alt="Logo"
              className="h-24 w-24 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
              {getInitials(user?.name ?? null, user?.email ?? "")}
            </div>
          )}
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-text-primary">
              {user?.name ?? "—"}
            </p>
            <p className="text-xs text-text-secondary/80">{user?.role}</p>
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose image
            </Button>
            {selectedFile && (
              <Button
                type="button"
                className="w-full"
                onClick={() => logoMutation.mutate()}
                disabled={logoMutation.isPending}
              >
                {logoMutation.isPending ? "Uploading..." : "Upload logo"}
              </Button>
            )}
            <p className="text-xs text-text-secondary/80 text-center">
              JPEG, PNG, or WebP · max 2 MB
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
