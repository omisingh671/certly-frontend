import { FormEvent, useState } from "react";
import { Award, Calendar, Check, Copy, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components/public-layout";
import { api } from "@/api";
import { resolvePdfAssetUrl } from "@/lib/asset-url";
import { type LearnerCertificateDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";

type Step = "email" | "otp" | "list";

export const CredentialsPage = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [certificates, setCertificates] = useState<LearnerCertificateDto[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [copiedQr, setCopiedQr] = useState(false);
  const { pushToast } = useToast();

  const requestOtpMutation = useMutation({
    mutationFn: () => api.credentials.requestOtp(email),
    onSuccess: () => {
      setStep("otp");
      pushToast({ title: "Check your email for the access code", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => api.credentials.verifyOtp(email, otp),
    onSuccess: (data) => {
      setCertificates(data.certificates);
      setSelectedCertId(data.certificates[0]?.id ?? null);
      setStep("list");
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestOtpMutation.mutate();
  };

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    verifyOtpMutation.mutate();
  };

  const selectedCert = certificates.find((c) => c.id === selectedCertId) ?? null;

  return (
    <PublicLayout>
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        {step === "email" && (
          <div className="w-full max-w-5xl">
            <Card>
              <div className="mx-auto max-w-md">
                <p className="font-display text-3xl font-semibold text-text-primary">Access my certificates</p>
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  Enter your email address and we'll send you a one-time access code to view your certificates.
                </p>
                <form className="mt-8 space-y-4" onSubmit={handleEmailSubmit}>
                  <Field label="Email address">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </Field>
                  <Button
                    className="w-full bg-primary hover:bg-primary-hover"
                    type="submit"
                    disabled={requestOtpMutation.isPending}
                  >
                    {requestOtpMutation.isPending ? "Sending code..." : "Send access code"}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}

        {step === "otp" && (
          <div className="w-full max-w-5xl">
            <Card>
              <div className="mx-auto max-w-md">
                <p className="font-display text-3xl font-semibold text-text-primary">Enter your code</p>
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  We sent a 6-digit access code to <span className="font-medium text-text-primary">{email}</span>. It expires in 10 minutes.
                </p>
                <form className="mt-8 space-y-4" onSubmit={handleOtpSubmit}>
                  <Field label="Access code">
                    <Input
                      placeholder="000000"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      maxLength={6}
                      required
                    />
                  </Field>
                  <Button
                    className="w-full bg-primary hover:bg-primary-hover"
                    type="submit"
                    disabled={verifyOtpMutation.isPending}
                  >
                    {verifyOtpMutation.isPending ? "Verifying..." : "Access certificates"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-text-secondary/80 hover:text-text-secondary"
                    onClick={() => setStep("email")}
                  >
                    Use a different email
                  </button>
                </form>
              </div>
            </Card>
          </div>
        )}

        {step === "list" && (
          <div className="w-full max-w-5xl">
            <div className="mb-6">
              <p className="font-display text-2xl font-semibold text-text-primary">Your certificates</p>
              <p className="mt-1 text-sm text-text-secondary">{email}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" style={{ minHeight: 480 }}>
              <div className="flex h-full" style={{ minHeight: 480 }}>
                {/* Left panel — cert list */}
                <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-elevated p-3 space-y-1.5">
                  <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-widest text-text-secondary/80">
                    {certificates.length} {certificates.length === 1 ? "certificate" : "certificates"}
                  </p>
                  {certificates.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-secondary/80">No certificates found.</p>
                  ) : (
                    certificates.map((cert) => (
                      <button
                        key={cert.id}
                        onClick={() => setSelectedCertId(cert.id)}
                        className={[
                          "w-full rounded-xl border p-3 text-left transition-all",
                          cert.id === selectedCertId
                            ? "border-primary bg-surface ring-2 ring-primary/25 shadow-sm"
                            : "border-transparent bg-transparent hover:bg-surface hover:border-border hover:shadow-sm",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                            <Award size={14} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{cert.templateName}</p>
                            <p className="truncate text-xs text-text-secondary">{cert.batchName}</p>
                            <p className="mt-0.5 text-[11px] text-text-secondary/80">{formatDateTime(cert.issuedAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </aside>

                {/* Right panel — cert detail */}
                <div className="flex flex-1 flex-col overflow-y-auto bg-elevated/40">
                  {selectedCert ? (
                    <>
                      {/* Detail header */}
                      <div className="border-b border-border bg-surface px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
                            <Award size={22} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-display text-lg font-semibold text-text-primary">{selectedCert.templateName}</p>
                            <p className="text-sm text-text-secondary">{selectedCert.batchName}</p>
                          </div>
                        </div>
                      </div>

                      {/* Detail body */}
                      <div className="flex-1 px-8 py-6">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-secondary/80">Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3">
                            <Calendar size={14} className="shrink-0 text-primary" />
                            <div>
                              <p className="text-[11px] text-text-secondary/80">Issued on</p>
                              <p className="text-sm font-medium text-text-primary">{formatDateTime(selectedCert.issuedAt)}</p>
                            </div>
                          </div>

                          {Object.entries(selectedCert.data ?? {}).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-border bg-surface px-4 py-3">
                              <p className="text-[11px] capitalize text-text-secondary/80">{key.replace(/_/g, " ")}</p>
                              <p className="mt-0.5 text-sm font-medium text-text-primary break-words">{String(value ?? "—")}</p>
                            </div>
                          ))}

                          {selectedCert.qrCode && (
                            <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-[11px] text-text-secondary/80">Verification code</p>
                                <p className="truncate font-mono text-sm text-text-primary">{selectedCert.qrCode}</p>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 rounded-lg border border-border p-1.5 text-text-secondary/80 hover:border-border hover:bg-elevated hover:text-text-secondary transition-colors"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedCert.qrCode!);
                                  setCopiedQr(true);
                                  setTimeout(() => setCopiedQr(false), 2000);
                                }}
                                title="Copy verification code"
                              >
                                {copiedQr ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                              </button>
                            </div>
                          )}
                        </div>

                        {!selectedCert.pdfReady && (
                          <p className="mt-4 rounded-xl border border-warning/30 bg-accent-soft px-4 py-3 text-xs text-warning">
                            PDF is being generated — check back shortly.
                          </p>
                        )}
                      </div>

                      {/* Detail footer */}
                      <div className="border-t border-border bg-surface px-8 py-4">
                        <Button
                          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40"
                          disabled={!selectedCert.pdfReady || selectedCert.pdfUrl === null}
                          onClick={() => {
                            if (selectedCert.pdfUrl) {
                              window.open(resolvePdfAssetUrl(selectedCert.pdfUrl) ?? undefined, "_blank");
                            }
                          }}
                        >
                          <Download size={15} className="mr-2" />
                          Download certificate
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-sm text-text-secondary/80">Select a certificate to view details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </PublicLayout>
  );
};
