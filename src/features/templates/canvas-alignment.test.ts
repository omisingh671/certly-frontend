import { describe, expect, it } from "vitest";
import { snapRect, snapResizedRect, type AlignmentRect } from "@/features/templates/canvas-alignment";
import type { TemplateLayoutBlock } from "@/features/templates/template-layout";

const page = { width: 842, height: 595 };

const block = (input: Partial<TemplateLayoutBlock>): TemplateLayoutBlock => ({
  id: input.id ?? "block-1",
  type: input.type ?? "text",
  field: null,
  text: "Text",
  src: null,
  prefix: "",
  x: input.x ?? 0,
  y: input.y ?? 0,
  width: input.width ?? 100,
  height: input.height ?? 40,
  fontSize: 18,
  fontFamily: "Inter",
  fontStyle: "normal",
  lineHeight: 1.2,
  padding: 0,
  color: "#000000",
  fillColor: "transparent",
  borderWidth: 0,
  fontWeight: 400,
  align: "left",
  verticalAlign: "top",
  objectFit: "contain",
  opacity: 1,
  groupId: null,
  ...input,
});

const snap = (
  rect: AlignmentRect,
  options: Partial<Parameters<typeof snapRect>[1]> = {},
) =>
  snapRect(rect, {
    page,
    blocks: [],
    movingBlockIds: [],
    snapToGrid: false,
    snapToGuides: false,
    ...options,
  });

describe("canvas alignment snapping", () => {
  it("snaps to page center and edges only when guide snapping is enabled", () => {
    const nearCenter = { x: 316, y: 277, width: 200, height: 40 };

    expect(snap(nearCenter).rect).toEqual(nearCenter);
    expect(snap(nearCenter, { snapToGuides: true }).rect).toEqual({ ...nearCenter, x: 321, y: 277.5 });

    const nearEdges = { x: 3, y: 4, width: 100, height: 40 };
    expect(snap(nearEdges, { snapToGuides: true }).rect).toEqual({ ...nearEdges, x: 0, y: 0 });
  });

  it("snaps to the 10px grid only when grid snapping is enabled", () => {
    const rect = { x: 104, y: 197, width: 100, height: 40 };

    expect(snap(rect).rect).toEqual(rect);
    expect(snap(rect, { snapToGrid: true }).rect).toEqual({ ...rect, x: 100, y: 200 });
  });

  it("returns guide line metadata for active snap matches", () => {
    const result = snap({ x: 318, y: 10, width: 200, height: 40 }, { snapToGuides: true });

    expect(result.guides).toContainEqual({ orientation: "vertical", position: 421 });
  });

  it("excludes moving blocks from other-element snap candidates", () => {
    const stationary = block({ id: "stationary", x: 300, y: 150, width: 100, height: 60 });
    const moving = block({ id: "moving", x: 120, y: 150, width: 100, height: 60 });
    const rect = { x: 116, y: 150, width: 100, height: 60 };

    expect(
      snap(rect, {
        blocks: [stationary, moving],
        movingBlockIds: ["moving"],
        snapToGuides: true,
      }).rect.x,
    ).toBe(116);
  });

  it("snaps resized rectangle edges to guide targets", () => {
    const result = snapResizedRect(
      { x: 100, y: 80, width: 318, height: 100 },
      {
        page,
        blocks: [],
        movingBlockIds: ["block-1"],
        snapToGrid: false,
        snapToGuides: true,
      },
    );

    expect(result.rect.width).toBe(321);
    expect(result.guides).toContainEqual({ orientation: "vertical", position: 421 });
  });
});
