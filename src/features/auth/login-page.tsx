import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth-store";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const showDemoCredentials = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === "true";
const demoEmail = "admin.demo@cms.local";
const demoPassword = "Admin@123";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState(showDemoCredentials ? demoEmail : "");
  const [password, setPassword] = useState(showDemoCredentials ? demoPassword : "");
  const { pushToast } = useToast();

  const loginMutation = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: (result) => {
      setSession(result.user, result.accessToken);
      pushToast({ title: "Welcome back", tone: "success" });
      navigate((location.state as { from?: string } | null)?.from ?? "/");
    },
    onError: (error) => {
      pushToast({ title: error.message, tone: "error" });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate();
  };

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <p className="font-display text-3xl font-semibold text-text-primary">
          Sign in
        </p>
        <p className="text-sm text-text-secondary">
          Access the credential operations dashboard.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary"
            >
              Forgot password?
            </Link>
          </div>
        </Field>
        <Button
          className="w-full py-3"
          type="submit"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Signing in..." : "Access dashboard"}
        </Button>
      </form>

      {showDemoCredentials && (
        <div className="mt-6 rounded-[24px] bg-accent-soft p-4 text-sm text-warning">
          Demo users:
          <div className="mt-2 space-y-1">
            <p>superadmin@cms.local / SuperAdmin@123</p>
            <p>{demoEmail} / {demoPassword}</p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
