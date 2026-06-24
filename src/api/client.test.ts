import { describe, expect, it } from "vitest";
import { ApiClientError, normalizeApiError } from "@/api/client";

describe("normalizeApiError", () => {
  it("preserves already normalized API errors", () => {
    const error = new ApiClientError({
      code: "TEMPLATE_IN_USE",
      message: "Template fields cannot be modified because certificates have already been issued using this template",
    });

    expect(normalizeApiError(error)).toBe(error);
  });

  it("uses mapped messages for backend API error codes", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: "TEMPLATE_IN_USE",
            message: "Backend fallback message",
          },
        },
      },
    };

    expect(normalizeApiError(error).message).toBe(
      "Template fields cannot be modified because this template is already used by certificates.",
    );
  });

  it("keeps backend messages for unmapped API error codes", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: "FUTURE_BUSINESS_RULE",
            message: "A specific backend rule failed",
          },
        },
      },
    };

    expect(normalizeApiError(error).message).toBe("A specific backend rule failed");
  });
});
