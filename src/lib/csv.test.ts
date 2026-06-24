import { describe, expect, it } from "vitest";
import { rowsToCsv } from "@/lib/csv";

describe("rowsToCsv", () => {
  it("serializes headers and rows in the provided order", () => {
    const csv = rowsToCsv(
      ["name", "email"],
      [
        { name: "Aarav", email: "aarav@example.com" },
        { name: "Nisha", email: "nisha@example.com" },
      ],
    );

    expect(csv).toBe("name,email\nAarav,aarav@example.com\nNisha,nisha@example.com");
  });

  it("escapes commas and quotes", () => {
    const csv = rowsToCsv(["title"], [{ title: 'Lead, "Advanced"' }]);

    expect(csv).toBe('title\n"Lead, ""Advanced"""');
  });
});
