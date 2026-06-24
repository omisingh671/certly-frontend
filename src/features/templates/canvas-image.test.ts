import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCanvasImage } from "@/features/templates/canvas-image";

describe("loadCanvasImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns the image src without forcing crossOrigin", () => {
    const assignments: string[] = [];

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(value: string) {
        assignments.push(`src:${value}`);
      }
    }

    vi.stubGlobal("Image", MockImage);

    loadCanvasImage(
      "https://eicta-certificate-dev.s3.ap-south-1.amazonaws.com/uploads/templates/template-1/design-images/logo.png",
      {
        onLoad: vi.fn(),
        onError: vi.fn(),
      },
    );

    expect(assignments).toEqual([
      "src:https://eicta-certificate-dev.s3.ap-south-1.amazonaws.com/uploads/templates/template-1/design-images/logo.png",
    ]);
  });
});
