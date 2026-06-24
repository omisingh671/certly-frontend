import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import { ApiClientError } from "@/api/client";
import type { BulkIssuanceResultDto, CsvValidationResultDto, TemplateFieldDto } from "@/api/types";
import { BatchIssuanceTab } from "./batch-issuance-tab";

const fields: TemplateFieldDto[] = [
  { id: "name", name: "recipientName", type: "TEXT", required: true },
  { id: "email", name: "recipientEmail", type: "EMAIL", required: true },
  { id: "grade", name: "Grade Point", type: "NUMBER", required: true },
  { id: "date", name: "issueDate", type: "DATE", required: true },
];

const validationResult: CsvValidationResultDto = {
  summary: { total: 15, valid: 0, invalid: 15, duplicate: 0 },
  fields: fields.map((field) => field.name),
  rows: Array.from({ length: 15 }, (_, index) => ({
    row: index + 2,
    data: {
      recipientName: `Learner ${index + 1}`,
      recipientEmail: `learner${index + 1}@example.edu`,
      issueDate: "2026-06-14",
    },
    valid: false,
    duplicate: false,
    error: {
      code: "INVALID_DYNAMIC_FIELDS",
      message: "Certificate data does not match the template field schema",
      details: {
        invalidFields: [],
        missingFields: ["Grade Point"],
        invalidFieldTypes: [],
      },
    },
  })),
};

const readyValidationResult: CsvValidationResultDto = {
  summary: { total: 2, valid: 2, invalid: 0, duplicate: 0 },
  fields: fields.map((field) => field.name),
  rows: [
    {
      row: 2,
      data: {
        recipientName: "Aarav Sharma",
        recipientEmail: "aarav@example.edu",
        "Grade Point": "9.4",
        issueDate: "2026-06-14",
      },
      valid: true,
      duplicate: false,
    },
    {
      row: 3,
      data: {
        recipientName: "Ishika Verma",
        recipientEmail: "ishika@example.edu",
        "Grade Point": "9.2",
        issueDate: "2026-06-14",
      },
      valid: true,
      duplicate: false,
    },
  ],
};

const bulkResult = (overrides: Partial<BulkIssuanceResultDto> = {}): BulkIssuanceResultDto => ({
  summary: { total: 2, succeeded: 2, failed: 0, skipped: 0 },
  created: [],
  failed: [],
  ...overrides,
});

const renderIssuanceTab = (onViewCertificates = vi.fn()) => {
  render(
    <AppProviders>
      <BatchIssuanceTab batchId="batch-csv-validation" fields={fields} onViewCertificates={onViewCertificates} />
    </AppProviders>,
  );
  return onViewCertificates;
};

const uploadReadyCsv = async (user: ReturnType<typeof userEvent.setup>) => {
  const file = new File([
    "recipientName,recipientEmail,Grade Point,issueDate\nAarav Sharma,aarav@example.edu,9.4,2026-06-14\nIshika Verma,ishika@example.edu,9.2,2026-06-14",
  ], "learners.csv", { type: "text/csv" });
  await user.upload(screen.getByLabelText("Upload CSV"), file);
  await screen.findByText("2 selected");
};

describe("batch CSV issuance validation feedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("explains an absent required template field and revalidates an edited row", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.batches, "validateCsv").mockResolvedValue(validationResult);

    renderIssuanceTab();

    const file = new File(["recipientName,recipientEmail,issueDate\nLearner 1,learner1@example.edu,2026-06-14"], "learners.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText("Upload CSV"), file);

    expect(await screen.findByRole("status")).toHaveTextContent("CSV uploaded — review the rows below.");
    expect(screen.getByLabelText("Upload CSV")).toHaveClass("border-success");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("15 rows failed validation.");
    expect(alert).toHaveTextContent("15 rows: Add the required “Grade Point” column and a value for each row.");
    expect(screen.getAllByText("Missing required field “Grade Point”.")).not.toHaveLength(0);

    const gradePointInputs = screen.getAllByDisplayValue("");
    await user.type(gradePointInputs[0]!, "9.4");

    expect(screen.getByRole("alert")).toHaveTextContent("14 rows failed validation.");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear CSV" })).toHaveLength(1);
  });

  it("keeps a failed CSV selection clearable and shows the parser guidance inline", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.batches, "validateCsv").mockRejectedValue(new ApiClientError({
      code: "INVALID_CSV",
      message: "The CSV file is invalid or malformed.",
      details: {
        reason: "INCONSISTENT_COLUMNS",
        line: 2,
        expectedColumns: 4,
        actualColumns: 5,
      },
    }));

    renderIssuanceTab();

    const file = new File(["recipientName,recipientEmail,Issue Date\nAarav,aarav@example.edu,14, June 2026"], "malformed.csv", {
      type: "text/csv",
    });
    const input = screen.getByLabelText("Upload CSV") as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Row 2 has 5 columns, but the header has 4. Wrap values containing commas in double quotes.",
    );
    expect(screen.getByText("Selected: malformed.csv")).toBeInTheDocument();
    expect(input.files?.[0]).toBe(file);

    await user.click(screen.getByRole("button", { name: "Clear CSV" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Selected: malformed.csv")).not.toBeInTheDocument();
    expect(input.files).toHaveLength(0);
  });

  it("shows a full-success result and opens Certificates only after the user chooses it", async () => {
    const user = userEvent.setup();
    const onViewCertificates = vi.fn();
    vi.spyOn(api.batches, "validateCsv").mockResolvedValue(readyValidationResult);
    vi.spyOn(api.batches, "issueCsv").mockResolvedValue(bulkResult());
    renderIssuanceTab(onViewCertificates);

    await uploadReadyCsv(user);
    await user.click(screen.getByRole("button", { name: "Confirm issuance for 2 of 2 rows" }));

    expect(await screen.findByText("2 certificates issued successfully")).toBeInTheDocument();
    expect(onViewCertificates).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "View certificates" }));
    expect(onViewCertificates).toHaveBeenCalledTimes(1);
  });

  it("shows partial counts and failed-row details", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.batches, "validateCsv").mockResolvedValue(readyValidationResult);
    vi.spyOn(api.batches, "issueCsv").mockResolvedValue(bulkResult({
      summary: { total: 2, succeeded: 1, failed: 1, skipped: 0 },
      failed: [{
        row: 3,
        data: readyValidationResult.rows[1]!.data,
        error: { code: "DUPLICATE_CERTIFICATE", message: "A certificate already exists for this recipient." },
      }],
    }));
    renderIssuanceTab();

    await uploadReadyCsv(user);
    await user.click(screen.getByRole("button", { name: "Confirm issuance for 2 of 2 rows" }));

    expect(await screen.findByText("CSV issuance completed with exceptions")).toBeInTheDocument();
    expect(screen.getByText("Issued").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Failed").parentElement).toHaveTextContent("1");
    expect(screen.getByText("CSV row 3:").parentElement).toHaveTextContent("A certificate already exists for this recipient.");
  });

  it("makes a new CSV the recovery action when all rows fail", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.batches, "validateCsv").mockResolvedValue(readyValidationResult);
    vi.spyOn(api.batches, "issueCsv").mockResolvedValue(bulkResult({
      summary: { total: 2, succeeded: 0, failed: 2, skipped: 0 },
      failed: [{
        row: 2,
        data: readyValidationResult.rows[0]!.data,
        error: { code: "INVALID_RECORD", message: "Recipient data could not be issued." },
      }],
    }));
    renderIssuanceTab();

    await uploadReadyCsv(user);
    await user.click(screen.getByRole("button", { name: "Confirm issuance for 2 of 2 rows" }));

    expect(await screen.findByText("No certificates were issued")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View certificates" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Issue another CSV" }));
    expect(screen.getByLabelText("Upload CSV")).toBeInTheDocument();
    expect(screen.queryByText("No certificates were issued")).not.toBeInTheDocument();
  });

  it("keeps the reviewed CSV visible when issuance fails at the request level", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.batches, "validateCsv").mockResolvedValue(readyValidationResult);
    vi.spyOn(api.batches, "issueCsv").mockRejectedValue(new Error("Issuance service is unavailable"));
    renderIssuanceTab();

    await uploadReadyCsv(user);
    await user.click(screen.getByRole("button", { name: "Confirm issuance for 2 of 2 rows" }));

    expect(await screen.findByText("Issuance service is unavailable")).toBeInTheDocument();
    expect(await screen.findByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm issuance for 2 of 2 rows" })).toBeInTheDocument();
  });
});
