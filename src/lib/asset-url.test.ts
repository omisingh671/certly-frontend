import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "@/api/client";
import {
  resolveAssetUrl,
  resolveCanvasAssetUrl,
  resolvePdfAssetUrl,
} from "@/lib/asset-url";

describe("resolveAssetUrl", () => {
  it("passes through absolute and browser-managed URLs", () => {
    expect(resolveAssetUrl("https://cdn.example.com/uploads/logo.png")).toBe(
      "https://cdn.example.com/uploads/logo.png",
    );
    expect(
      resolveAssetUrl(
        "https://eicta-certificate-dev.s3.ap-south-1.amazonaws.com/uploads/templates/template-1/design-images/logo.png",
      ),
    ).toBe(
      "https://eicta-certificate-dev.s3.ap-south-1.amazonaws.com/uploads/templates/template-1/design-images/logo.png",
    );
    expect(
      resolveAssetUrl("https://assets.certificate.ifacet.in/uploads/logos/logo.png"),
    ).toBe("https://assets.certificate.ifacet.in/uploads/logos/logo.png");
    expect(resolveAssetUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(resolveAssetUrl("blob:http://localhost/image-id")).toBe("blob:http://localhost/image-id");
  });

  it("resolves legacy upload paths against the API base URL", () => {
    expect(resolveAssetUrl("/uploads/logos/logo.png")).toBe(
      `${API_BASE_URL.replace(/\/+$/, "")}/uploads/logos/logo.png`,
    );
    expect(resolveAssetUrl("uploads/logos/logo.png")).toBe(
      `${API_BASE_URL.replace(/\/+$/, "")}/uploads/logos/logo.png`,
    );
  });

  it("returns null for empty values", () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl("  ")).toBeNull();
  });

  it("routes uploaded canvas images through the API image relay", () => {
    const key =
      "uploads/templates/template-1/design-images/certificate-background.png";

    expect(
      resolveCanvasAssetUrl(
        `https://certificate.dev.ifacet.in/${key}`,
      ),
    ).toBe(`https://certificate.dev.ifacet.in/${key}`);
    expect(resolveCanvasAssetUrl(`/${key}`)).toBe(
      `${API_BASE_URL.replace(/\/+$/, "")}/assets/image?key=${encodeURIComponent(key)}`,
    );
  });

  it("leaves browser-managed and unrelated canvas URLs unchanged", () => {
    expect(resolveCanvasAssetUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
    expect(resolveCanvasAssetUrl("https://example.com/image.svg")).toBe(
      "https://example.com/image.svg",
    );
  });

  it("routes stored PDFs through the private storage relay", () => {
    const key =
      "uploads/batches/batch-1/certificates/learner-certificate-id.pdf";

    expect(
      resolvePdfAssetUrl(
        `https://eicta-certificate-dev.s3.ap-south-1.amazonaws.com/${key}`,
      ),
    ).toBe(
      `${API_BASE_URL.replace(/\/+$/, "")}/assets/pdf?key=${encodeURIComponent(key)}`,
    );
    expect(resolvePdfAssetUrl(`/${key}`)).toBe(
      `${API_BASE_URL.replace(/\/+$/, "")}/assets/pdf?key=${encodeURIComponent(key)}`,
    );
  });
});
