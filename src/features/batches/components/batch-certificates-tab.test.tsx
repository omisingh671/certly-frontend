import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import type { CertificateDto, TemplateFieldDto } from "@/api/types";
import { BatchCertificatesTab } from "./batch-certificates-tab";

const fields: TemplateFieldDto[] = [
  {
    id: "field-name",
    name: "recipientName",
    type: "TEXT",
    required: true,
  },
  {
    id: "field-email",
    name: "recipientEmail",
    type: "EMAIL",
    required: true,
  },
];

const certificate = (
  input: Partial<CertificateDto> & Pick<CertificateDto, "id" | "status">,
): CertificateDto => ({
  id: input.id,
  batchId: input.batchId ?? "batch-versioning",
  data: input.data ?? {
    recipientName: "Versioned Learner",
    recipientEmail: "versioned@example.com",
  },
  status: input.status,
  issuedAt: input.issuedAt ?? "2026-06-12T10:00:00.000Z",
  qrCode: input.qrCode ?? "CERT-V1",
  verificationCode: input.verificationCode ?? "CERT-V1",
  version: input.version ?? 1,
  parentId: input.parentId ?? null,
  pdfStatus: input.pdfStatus ?? null,
  pdfUrl: input.pdfUrl ?? null,
});

describe("batch certificate versioning actions", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("offers reject and revoke for an issued certificate and explains versioned rejection", async () => {
    const user = userEvent.setup();
    const issued = certificate({
      id: "issued-v1",
      status: "ISSUED",
      pdfStatus: "DONE",
      pdfUrl: "/uploads/issued-v1.pdf",
    });
    vi.spyOn(api.batches, "certificates").mockResolvedValue([issued]);

    render(
      <AppProviders>
        <BatchCertificatesTab batchId="batch-issued-actions" fields={fields} />
      </AppProviders>,
    );

    expect(await screen.findByRole("button", { name: "Revoke" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(
      screen.getByText(
        "This will invalidate the current PDF and reject this issued version. Reprocessing will create a new editable certificate version.",
      ),
    ).toBeInTheDocument();
  });

  it("selects and announces the new pending version returned by reprocess", async () => {
    const user = userEvent.setup();
    const rejected = certificate({
      id: "rejected-v1",
      status: "REJECTED",
    });
    const pendingV2 = certificate({
      id: "pending-v2",
      status: "PENDING",
      version: 2,
      parentId: rejected.id,
      issuedAt: null,
      qrCode: "CERT-V2",
      verificationCode: "CERT-V2",
    });

    vi.spyOn(api.batches, "certificates")
      .mockResolvedValueOnce([rejected])
      .mockResolvedValue([pendingV2, rejected]);
    const reprocess = vi
      .spyOn(api.batches, "reprocessCertificate")
      .mockResolvedValue(pendingV2);

    render(
      <AppProviders>
        <BatchCertificatesTab batchId="batch-reprocess-version" fields={fields} />
      </AppProviders>,
    );

    await user.click(await screen.findByRole("button", { name: "Reprocess" }));

    await waitFor(() =>
      expect(reprocess).toHaveBeenCalledWith(
        "batch-reprocess-version",
        "rejected-v1",
      ),
    );
    expect(await screen.findByText("Pending version 2 created")).toBeInTheDocument();
    expect(await screen.findByText("v2")).toBeInTheDocument();
    const issueNowButton = screen.getByRole("button", { name: "Issue Now" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    expect(issueNowButton).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(issueNowButton.parentElement).toContainElement(rejectButton);
  });

  it("keeps the current PDF downloadable while a replacement is generating", async () => {
    const pendingReplacement = certificate({
      id: "issued-pending-replacement",
      status: "ISSUED",
      pdfStatus: "PROCESSING",
      pdfUrl: "/uploads/issued-pending-replacement.pdf",
    });
    vi.spyOn(api.batches, "certificates").mockResolvedValue([pendingReplacement]);

    render(
      <AppProviders>
        <BatchCertificatesTab batchId="batch-pending-replacement" fields={fields} />
      </AppProviders>,
    );

    expect(await screen.findByRole("button", { name: "Generating replacement PDF..." })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Download current PDF" })).toBeInTheDocument();
  });

  it("labels a first PDF generation without implying a replacement", async () => {
    const firstGeneration = certificate({
      id: "issued-first-generation",
      status: "ISSUED",
      pdfStatus: "PENDING",
      pdfUrl: null,
    });
    vi.spyOn(api.batches, "certificates").mockResolvedValue([firstGeneration]);

    render(
      <AppProviders>
        <BatchCertificatesTab batchId="batch-first-generation" fields={fields} />
      </AppProviders>,
    );

    expect(await screen.findByRole("button", { name: "Generating PDF..." })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Generating replacement PDF..." })).not.toBeInTheDocument();
  });
});
