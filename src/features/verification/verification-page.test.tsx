import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import type {
  CertificateStatus,
  VerificationResultDto,
} from "@/api/types";
import { VerificationPage } from "@/features/verification/verification-page";

const createVerificationResult = (
  status: CertificateStatus,
  latestCertificate: VerificationResultDto["latestCertificate"] = null,
): VerificationResultDto => ({
  status,
  certificate: {
    id: "certificate-1",
    batchId: "batch-1",
    data: { Recipient: "Original recipient" },
    status,
    issuedAt: "2026-06-23T11:27:00.000Z",
    qrCode: null,
    verificationCode: "CERT-1",
    version: 1,
    parentId: null,
    pdfStatus: "DONE",
    pdfUrl: null,
  },
  latestCertificate,
  template: {
    id: "template-1",
    name: "Course Completion Certificate",
    category: null,
    batchCount: 1,
  },
  issuer: {
    id: "issuer-1",
    name: "Demo Admin",
    email: "admin@example.com",
    logoUrl: null,
    role: "ADMIN",
    isActive: true,
  },
});

const issuedSuccessor: VerificationResultDto["latestCertificate"] = {
  id: "certificate-2",
  batchId: "batch-1",
  data: { Recipient: "Corrected recipient" },
  status: "ISSUED",
  issuedAt: "2026-06-24T11:27:00.000Z",
  qrCode: null,
  verificationCode: "CERT-2",
  version: 2,
  parentId: "certificate-1",
  pdfStatus: "DONE",
  pdfUrl: null,
};

const renderVerification = (result: VerificationResultDto) => {
  vi.spyOn(api.verification, "verify").mockResolvedValue(result);

  render(
    <AppProviders>
      <MemoryRouter initialEntries={["/verify?code=CERT-1"]}>
        <VerificationPage />
      </MemoryRouter>
    </AppProviders>,
  );
};

describe("verification page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    {
      status: "REVOKED" as const,
      title: "This certificate has been revoked and is no longer valid.",
      detail: "Please contact the issuing organization for further assistance.",
    },
    {
      status: "REJECTED" as const,
      title: "This certificate has been rejected and is not valid.",
      detail: "Please contact the issuing organization for clarification.",
    },
  ])("shows factual $status messaging when no successor exists", async ({ status, title, detail }) => {
    renderVerification(createVerificationResult(status));

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(detail)).toBeInTheDocument();
    expect(screen.getByText("Originally issued at")).toBeInTheDocument();
    expect(screen.queryByText(/Latest issued version/)).not.toBeInTheDocument();
  });

  it.each([
    {
      status: "REVOKED" as const,
      title: "This certificate has been superseded and is no longer valid.",
    },
    {
      status: "REJECTED" as const,
      title: "This certificate has been rejected and is no longer valid.",
    },
  ])("shows an issued successor for $status certificates", async ({ status, title }) => {
    renderVerification(createVerificationResult(status, issuedSuccessor));

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText("A newer version has been issued.")).toBeInTheDocument();
    expect(screen.getByText("Latest issued version (v2)")).toBeInTheDocument();
    expect(screen.getByText("Corrected recipient")).toBeInTheDocument();
  });

  it("keeps issued certificates free of invalid-status messaging", async () => {
    renderVerification(createVerificationResult("ISSUED"));

    expect(await screen.findByText("ISSUED")).toBeInTheDocument();
    expect(screen.getByText("Issued at")).toBeInTheDocument();
    expect(screen.queryByText(/This certificate has been/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Latest issued version/)).not.toBeInTheDocument();
  });
});
