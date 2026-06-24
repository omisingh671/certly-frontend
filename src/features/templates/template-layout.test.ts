import { describe, it, expect } from "vitest";
import {
  normalizeTemplateLayout,
  serializeTemplateLayout,
  moveTemplateLayoutBlocksBy,
  createTemplateLayoutBlock,
  duplicateTemplateLayoutBlock,
  renderTemplateText,
} from "./template-layout";

describe("template-layout lock/unlock helpers", () => {
  it("renders placeholders with spaces and trims token-edge whitespace", () => {
    expect(renderTemplateText(
      "Grade: {{Grade Point}} / {{ recipientName }} / {{unknownField}}",
      { "Grade Point": "A", recipientName: "Ishika Verma" },
    )).toBe("Grade: A / Ishika Verma / ");
  });

  it("should normalize and parse isLocked field correctly", () => {
    const rawLayout = {
      version: 1,
      page: {
        size: "A4",
        orientation: "landscape",
        background: "#ffffff",
        width: 842,
        height: 595,
      },
      blocks: [
        {
          id: "block-1",
          type: "text",
          x: 100,
          y: 200,
          isLocked: true,
        },
        {
          id: "block-2",
          type: "rect",
          x: 50,
          y: 50,
          borderWidth: 8,
        },
      ],
    };

    const normalized = normalizeTemplateLayout(rawLayout);
    expect(normalized.blocks[0].isLocked).toBe(true);
    expect(normalized.blocks[1].isLocked).toBe(false);
    expect(normalized.blocks[1].borderWidth).toBe(8);
  });

  it("should serialize isLocked field correctly", () => {
    const layout = {
      version: 1,
      page: {
        size: "A4",
        orientation: "landscape" as const,
        background: "#ffffff",
        width: 842,
        height: 595,
      },
      groups: [],
      blocks: [
        createTemplateLayoutBlock("text", { id: "block-1", isLocked: true }),
        createTemplateLayoutBlock("rect", { id: "block-2", isLocked: false }),
      ],
    };

    const serialized = serializeTemplateLayout(layout) as { blocks: Record<string, unknown>[] };
    expect(serialized.blocks[0].isLocked).toBe(true);
    expect(serialized.blocks[1].isLocked).toBe(false);
    expect(serialized.blocks[1].borderWidth).toBe(3);
  });

  it("defaults legacy rectangle borders to 3 and clamps negative widths", () => {
    const legacy = normalizeTemplateLayout({
      blocks: [{ id: "legacy-rect", type: "rect" }],
    });
    const invalid = normalizeTemplateLayout({
      blocks: [{ id: "invalid-rect", type: "rect", borderWidth: -4 }],
    });

    expect(legacy.blocks[0].borderWidth).toBe(3);
    expect(invalid.blocks[0].borderWidth).toBe(0);
  });

  it("should prevent moving locked blocks using moveTemplateLayoutBlocksBy", () => {
    const layout = {
      version: 1,
      page: {
        size: "A4",
        orientation: "landscape" as const,
        background: "#ffffff",
        width: 842,
        height: 595,
      },
      groups: [],
      blocks: [
        createTemplateLayoutBlock("text", { id: "block-1", x: 100, y: 100, isLocked: true }),
        createTemplateLayoutBlock("text", { id: "block-2", x: 100, y: 100, isLocked: false }),
      ],
    };

    const moved = moveTemplateLayoutBlocksBy(layout, ["block-1", "block-2"], { x: 50, y: 50 });
    expect(moved.blocks[0].x).toBe(100);
    expect(moved.blocks[0].y).toBe(100);
    expect(moved.blocks[1].x).toBe(150);
    expect(moved.blocks[1].y).toBe(150);
  });

  it("should duplicate locked block as unlocked", () => {
    const layout = {
      version: 1,
      page: {
        size: "A4",
        orientation: "landscape" as const,
        background: "#ffffff",
        width: 842,
        height: 595,
      },
      groups: [],
      blocks: [
        createTemplateLayoutBlock("text", { id: "block-1", x: 100, y: 100, isLocked: true }),
      ],
    };

    const result = duplicateTemplateLayoutBlock(layout, "block-1");
    expect(result.layout.blocks).toHaveLength(2);
    expect(result.layout.blocks[1].isLocked).toBe(false);
  });
});
