import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.auth.forgotPassword(email),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <AuthLayout>
      <div className="space-y-2">
        <p className="font-display text-3xl font-semibold text-text-primary">Forgot password</p>
        <p className="text-sm text-text-secondary">
          Enter your email and we'll send a reset link if an account exists.
        </p>
      </div>

      {submitted ? (
        <div className="mt-6 rounded-[24px] bg-accent-soft p-4 text-sm text-warning">
          If an account with that email exists, a reset link has been sent. Check your inbox.
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Button className="w-full py-3" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send reset link"}
          </Button>
          {mutation.isError && (
            <p className="text-sm text-danger">{mutation.error.message}</p>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link to="/login" className="text-text-primary underline underline-offset-2 hover:opacity-70">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
