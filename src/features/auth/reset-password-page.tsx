import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.auth.resetPassword(token, password),
    onSuccess: () => {
      pushToast({ title: "Password reset successfully. Please sign in.", tone: "success" });
      navigate("/login");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (password !== confirm) {
      setValidationError("Passwords do not match.");
      return;
    }

    mutation.mutate();
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-2">
          <p className="font-display text-3xl font-semibold text-text-primary">Invalid link</p>
          <p className="text-sm text-text-secondary">This reset link is missing or malformed.</p>
        </div>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/forgot-password" className="text-text-primary underline underline-offset-2 hover:opacity-70">
            Request a new link
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <p className="font-display text-3xl font-semibold text-text-primary">Reset password</p>
        <p className="text-sm text-text-secondary">Enter and confirm your new password.</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="New password">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
        {validationError && <p className="text-sm text-danger">{validationError}</p>}
        {mutation.isError && <p className="text-sm text-danger">{mutation.error.message}</p>}
        <Button className="w-full py-3" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Resetting..." : "Set new password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link to="/login" className="text-text-primary underline underline-offset-2 hover:opacity-70">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
