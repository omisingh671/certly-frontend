import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/public-layout";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import type { CertificateStatus } from "@/api/types";

const getInvalidCertificateMessage = (
  status: CertificateStatus,
  hasLatestCertificate: boolean,
) => {
  if (status === "REVOKED") {
    return hasLatestCertificate
      ? {
          title: "This certificate has been superseded and is no longer valid.",
          detail: "A newer version has been issued.",
        }
      : {
          title: "This certificate has been revoked and is no longer valid.",
          detail:
            "Please contact the issuing organization for further assistance.",
        };
  }

  if (status === "REJECTED") {
    return hasLatestCertificate
      ? {
          title: "This certificate has been rejected and is no longer valid.",
          detail: "A newer version has been issued.",
        }
      : {
          title: "This certificate has been rejected and is not valid.",
          detail:
            "Please contact the issuing organization for clarification.",
        };
  }

  return null;
};

export const VerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(() => searchParams.get("code") ?? "");
  const { pushToast } = useToast();

  const verificationMutation = useMutation({
    mutationFn: () => api.verification.verify(code),
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  useEffect(() => {
    if (searchParams.get("code")) {
      verificationMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    verificationMutation.mutate();
  };

  return (
    <PublicLayout>
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-5xl space-y-6">
          <Card>
            <div className="mx-auto max-w-md">
              <p className="font-display text-4xl font-semibold text-text-primary">
                Verify a credential
              </p>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                Enter the verification code from a certificate to confirm its
                status and issuer information.
              </p>
              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <Field label="Verification code">
                  <Input
                    placeholder="CERT-XXXXXXXXXXXX"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </Field>
                <Button
                  className="w-full bg-primary hover:bg-primary-hover"
                  type="submit"
                  disabled={verificationMutation.isPending}
                >
                  {verificationMutation.isPending
                    ? "Verifying..."
                    : "Verify now"}
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            {verificationMutation.data ? (
              <VerificationResult result={verificationMutation.data} />
            ) : (
              <div className="flex items-center justify-center py-12 text-center text-sm text-text-secondary">
                Verification details will appear here after you submit a valid
                certificate code.
              </div>
            )}
          </Card>
        </div>
      </main>
    </PublicLayout>
  );
};

const VerificationResult = ({
  result,
}: {
  result: Awaited<ReturnType<typeof api.verification.verify>>;
}) => {
  const isInvalid = result.status === "REVOKED" || result.status === "REJECTED";
  const invalidMessage = getInvalidCertificateMessage(
    result.status,
    result.latestCertificate !== null,
  );

  return (
    <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-3xl font-semibold text-text-primary">
                      Verification result
                    </p>
                    <p className="text-sm text-text-secondary">
                      {result.template.name}
                    </p>
                  </div>
                  <Badge
                    tone={
                      result.status === "ISSUED"
                        ? "success"
                        : result.status === "REJECTED"
                          ? "danger"
                          : result.status === "REVOKED"
                            ? "neutral"
                            : "warning"
                    }
                  >
                    {result.status}
                  </Badge>
                </div>

                {invalidMessage && (
                  <div className="rounded-[20px] border border-warning/30 bg-accent-soft px-4 py-3 text-sm text-warning">
                    <span className="font-semibold">
                      {invalidMessage.title}
                    </span>{" "}
                    {invalidMessage.detail}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-elevated shadow-none">
                    <p className="text-sm text-text-secondary">Issuer</p>
                    <div className="mt-2 flex items-center gap-2">
                      {result.issuer.logoUrl ? (
                        <img
                          src={resolveAssetUrl(result.issuer.logoUrl) ?? undefined}
                          alt="Issuer logo"
                          className="h-8 w-8 rounded-full object-cover border border-border"
                        />
                      ) : null}
                      <p className="font-semibold text-text-primary">
                        {result.issuer.name ?? result.issuer.email}
                      </p>
                    </div>
                  </Card>
                  <Card className="bg-elevated shadow-none">
                    <p className="text-sm text-text-secondary">
                      {isInvalid ? "Originally issued at" : "Issued at"}
                    </p>
                    <p className="mt-2 font-semibold text-text-primary">
                      {formatDateTime(
                        result.certificate.issuedAt,
                      )}
                    </p>
                  </Card>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(
                    result.certificate.data,
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-[20px] bg-elevated px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-text-secondary/80">
                        {key}
                      </p>
                      <p className="mt-2 font-medium text-text-primary">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>

                {result.latestCertificate && (
                    <div className="space-y-3">
                      <p className="font-semibold text-text-primary">
                        Latest issued version (v{result.latestCertificate.version})
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(
                          result.latestCertificate.data,
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-[20px] bg-primary-soft px-4 py-3"
                          >
                            <p className="text-xs uppercase tracking-[0.18em] text-primary">
                              {key}
                            </p>
                            <p className="mt-2 font-medium text-text-primary">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
    </div>
  );
};
