import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/api/client";
import type { CsvValidationRowDto, TemplateFieldDto } from "@/api/types";
import {
  getCsvUploadErrorMessage,
  getCsvRowErrorMessages,
  summarizeCsvValidationIssues,
  validateCsvDraftRow,
} from "./csv-validation";

const fields: TemplateFieldDto[] = [
  { id: "name", name: "recipientName", type: "TEXT", required: true },
  { id: "email", name: "recipientEmail", type: "EMAIL", required: true },
  { id: "grade", name: "Grade Point", type: "NUMBER", required: true },
  { id: "issued", name: "issueDate", type: "DATE", required: false },
];

const missingGradePointRow = (row: number): CsvValidationRowDto => ({
  row,
  data: {
    recipientName: "Aarav Sharma",
    recipientEmail: "aarav@example.edu",
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
});

describe("CSV validation feedback", () => {
  it("summarizes a missing template column across all invalid rows", () => {
    const issues = summarizeCsvValidationIssues([
      missingGradePointRow(2),
      missingGradePointRow(3),
      missingGradePointRow(4),
    ]);

    expect(issues).toEqual([
      {
        key: "missing:Grade Point:true",
        message: "Add the required “Grade Point” column and a value for each row.",
        count: 3,
      },
    ]);
  });

  it("explains row-level missing and invalid type errors", () => {
    expect(getCsvRowErrorMessages(missingGradePointRow(2).error)).toEqual([
      "Missing required field “Grade Point”.",
    ]);

    const invalid = validateCsvDraftRow({
      recipientName: "Aarav Sharma",
      recipientEmail: "not-an-email",
      "Grade Point": "not-a-number",
      issueDate: "not-a-date",
    }, fields);

    expect(getCsvRowErrorMessages(invalid)).toEqual([
      "“recipientEmail” must be a valid email.",
      "“Grade Point” must be a valid number.",
      "“issueDate” must be a valid date.",
    ]);
  });

  it("allows optional blanks but requires valid required field values", () => {
    expect(validateCsvDraftRow({
      recipientName: "Aarav Sharma",
      recipientEmail: "aarav@example.edu",
      "Grade Point": "9.4",
      issueDate: "",
    }, fields)).toBeUndefined();
  });

  it("accepts supported complete date formats while rejecting ambiguous or impossible dates", () => {
    const requiredDateFields = fields.map((field) => ({ ...field, required: field.name === "issueDate" }));
    const baseData = {
      recipientName: "Aarav Sharma",
      recipientEmail: "aarav@example.edu",
      "Grade Point": "9.4",
    };

    expect(validateCsvDraftRow({ ...baseData, issueDate: "2026-06-14" }, requiredDateFields)).toBeUndefined();
    expect(validateCsvDraftRow({ ...baseData, issueDate: "14/06/2026" }, requiredDateFields)).toBeUndefined();
    expect(validateCsvDraftRow({ ...baseData, issueDate: "14 June 2026" }, requiredDateFields)).toBeUndefined();
    expect(validateCsvDraftRow({ ...baseData, issueDate: "14 June, 2026" }, requiredDateFields)).toBeUndefined();
    expect(validateCsvDraftRow({ ...baseData, issueDate: "14-June-2026" }, requiredDateFields)).toBeUndefined();
    expect(validateCsvDraftRow({ ...baseData, issueDate: "14-June, 2026" }, requiredDateFields)).toBeUndefined();

    for (const issueDate of ["14 June", "June, 2026", "2026-02-30", "31/02/2026", "14/06/26", "14 Other 2026"]) {
      expect(validateCsvDraftRow({ ...baseData, issueDate }, requiredDateFields)).toMatchObject({
        code: "INVALID_DYNAMIC_FIELDS",
        details: {
          invalidFieldTypes: [{ field: "issueDate", expectedType: "DATE", actualType: "string" }],
        },
      });
    }
  });

  it("explains CSV parser column-count errors with the affected row", () => {
    expect(getCsvUploadErrorMessage(new ApiClientError({
      code: "INVALID_CSV",
      message: "The CSV file is invalid or malformed.",
      details: {
        reason: "INCONSISTENT_COLUMNS",
        line: 2,
        expectedColumns: 4,
        actualColumns: 5,
      },
    }))).toBe(
      "Row 2 has 5 columns, but the header has 4. Wrap values containing commas in double quotes.",
    );
  });
});
