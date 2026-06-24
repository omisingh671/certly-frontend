import { ApiClientError } from "@/api/client";
import type { CsvParseErrorDetails, CsvValidationErrorDto, CsvValidationRowDto, TemplateFieldDto } from "@/api/types";

type InvalidFieldType = {
  field: string;
  expectedType: TemplateFieldDto["type"];
  actualType: string;
};

type DynamicFieldValidationDetails = {
  invalidFields: string[];
  missingFields: string[];
  invalidFieldTypes: InvalidFieldType[];
};

export type CsvValidationIssueSummary = {
  key: string;
  message: string;
  count: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCsvParseErrorDetails = (value: unknown): value is CsvParseErrorDetails =>
  isRecord(value)
  && value.reason === "INCONSISTENT_COLUMNS"
  && typeof value.line === "number"
  && typeof value.expectedColumns === "number"
  && typeof value.actualColumns === "number";

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];

const getDynamicFieldValidationDetails = (details: unknown): DynamicFieldValidationDetails | undefined => {
  if (!isRecord(details)) return undefined;

  const invalidFieldTypes = Array.isArray(details.invalidFieldTypes)
    ? details.invalidFieldTypes.filter(
        (entry): entry is InvalidFieldType =>
          isRecord(entry)
          && typeof entry.field === "string"
          && typeof entry.expectedType === "string"
          && typeof entry.actualType === "string",
      )
    : [];

  return {
    invalidFields: toStringArray(details.invalidFields),
    missingFields: toStringArray(details.missingFields),
    invalidFieldTypes,
  };
};

const quoted = (field: string): string => `“${field}”`;

const formatFieldType = (type: TemplateFieldDto["type"]): string => type.toLowerCase();

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const monthNumbers: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const isCalendarDate = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const isValidDate = (value: string): boolean => {
  const normalizedValue = value.trim();
  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch !== null) {
    return isCalendarDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dayFirstMatch !== null) {
    return isCalendarDate(Number(dayFirstMatch[3]), Number(dayFirstMatch[2]), Number(dayFirstMatch[1]));
  }

  const namedMonthMatch = normalizedValue.match(/^(\d{1,2})[ -]([A-Za-z]+)(?:,?\s+|-)(\d{4})$/);

  if (namedMonthMatch === null) {
    return false;
  }

  const month = monthNumbers[namedMonthMatch[2].toLowerCase()];

  return month !== undefined
    && isCalendarDate(Number(namedMonthMatch[3]), month, Number(namedMonthMatch[1]));
};

const isValidFieldValue = (value: string, type: TemplateFieldDto["type"]): boolean => {
  switch (type) {
    case "NUMBER":
      return Number.isFinite(Number(value.trim()));
    case "EMAIL":
      return isValidEmail(value.trim());
    case "DATE":
      return isValidDate(value);
    case "TEXT":
      return value.trim().length > 0;
  }
};

export const validateCsvDraftRow = (
  data: Record<string, string>,
  fields: TemplateFieldDto[],
): CsvValidationErrorDto | undefined => {
  const allowedFieldNames = new Set(fields.map((field) => field.name));
  const invalidFields = Object.keys(data).filter((fieldName) => !allowedFieldNames.has(fieldName));
  const missingFields: string[] = [];
  const invalidFieldTypes: InvalidFieldType[] = [];

  for (const field of fields) {
    const value = data[field.name];

    if (value === undefined || value.trim().length === 0) {
      if (field.required) missingFields.push(field.name);
      continue;
    }

    if (!isValidFieldValue(value, field.type)) {
      invalidFieldTypes.push({
        field: field.name,
        expectedType: field.type,
        actualType: "string",
      });
    }
  }

  if (invalidFields.length === 0 && missingFields.length === 0 && invalidFieldTypes.length === 0) {
    return undefined;
  }

  return {
    code: "INVALID_DYNAMIC_FIELDS",
    message: "Certificate data does not match the template field schema",
    details: { invalidFields, missingFields, invalidFieldTypes },
  };
};

export const getCsvRowErrorMessages = (error: CsvValidationErrorDto | undefined): string[] => {
  if (error === undefined) return [];

  const details = getDynamicFieldValidationDetails(error.details);
  if (error.code !== "INVALID_DYNAMIC_FIELDS" || details === undefined) {
    return [error.message];
  }

  const messages = [
    ...details.missingFields.map((field) => `Missing required field ${quoted(field)}.`),
    ...details.invalidFields.map((field) => `Unexpected CSV field ${quoted(field)}.`),
    ...details.invalidFieldTypes.map(
      ({ field, expectedType }) => `${quoted(field)} must be a valid ${formatFieldType(expectedType)}.`,
    ),
  ];

  return messages.length > 0 ? messages : [error.message];
};

export const summarizeCsvValidationIssues = (rows: CsvValidationRowDto[]): CsvValidationIssueSummary[] => {
  const issues = new Map<string, CsvValidationIssueSummary>();

  const addIssue = (key: string, message: string) => {
    const issue = issues.get(key);
    if (issue !== undefined) {
      issue.count += 1;
      return;
    }

    issues.set(key, { key, message, count: 1 });
  };

  for (const row of rows) {
    if (row.valid || row.error === undefined) continue;

    const details = getDynamicFieldValidationDetails(row.error.details);
    if (row.error.code !== "INVALID_DYNAMIC_FIELDS" || details === undefined) {
      addIssue(`generic:${row.error.code}:${row.error.message}`, row.error.message);
      continue;
    }

    let hasSpecificIssue = false;

    for (const field of details.missingFields) {
      const columnIsAbsent = rows.every((entry) => !Object.prototype.hasOwnProperty.call(entry.data, field));
      addIssue(
        `missing:${field}:${columnIsAbsent}`,
        columnIsAbsent
          ? `Add the required ${quoted(field)} column and a value for each row.`
          : `Provide a value for required field ${quoted(field)}.`,
      );
      hasSpecificIssue = true;
    }

    for (const field of details.invalidFields) {
      addIssue(`unexpected:${field}`, `Remove unexpected CSV field ${quoted(field)} or add it to the template.`);
      hasSpecificIssue = true;
    }

    for (const { field, expectedType } of details.invalidFieldTypes) {
      addIssue(`type:${field}:${expectedType}`, `Enter a valid ${formatFieldType(expectedType)} for ${quoted(field)}.`);
      hasSpecificIssue = true;
    }

    if (!hasSpecificIssue) {
      addIssue(`generic:${row.error.code}:${row.error.message}`, row.error.message);
    }
  }

  return [...issues.values()].sort((left, right) => right.count - left.count || left.message.localeCompare(right.message));
};

export const createCsvSummary = (rows: CsvValidationRowDto[]) => ({
  total: rows.length,
  valid: rows.filter((row) => row.valid && !row.duplicate).length,
  invalid: rows.filter((row) => !row.valid).length,
  duplicate: rows.filter((row) => row.duplicate).length,
});

export const getCsvUploadErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code === "INVALID_CSV" && isCsvParseErrorDetails(error.details)) {
    const { actualColumns, expectedColumns, line } = error.details;
    return `Row ${line} has ${actualColumns} columns, but the header has ${expectedColumns}. Wrap values containing commas in double quotes.`;
  }

  return error instanceof Error ? error.message : "The CSV file could not be validated.";
};
