import type { TemplateLayoutBlock, TemplateLayoutPage } from "@/features/templates/template-layout";

export const GRID_SIZE = 10;
export const SNAP_TOLERANCE = 5;

export type AlignmentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AlignmentGuide = {
  orientation: "horizontal" | "vertical";
  position: number;
};

type SnapAxis = "x" | "y";

type SnapTarget = {
  value: number;
  guide: AlignmentGuide;
  priority: number;
};

type SnapAnchor = {
  value: number;
  edge: "start" | "center" | "end";
};

type SnapOptions = {
  page: Pick<TemplateLayoutPage, "width" | "height">;
  blocks: TemplateLayoutBlock[];
  movingBlockIds: string[];
  snapToGrid: boolean;
  snapToGuides: boolean;
  tolerance?: number;
  gridSize?: number;
};

export type SnapResult = {
  rect: AlignmentRect;
  guides: AlignmentGuide[];
};

const uniqueNumbers = (values: number[]): number[] => Array.from(new Set(values.map((value) => Math.round(value))));

const rectAnchorsForAxis = (rect: AlignmentRect, axis: SnapAxis): SnapAnchor[] => {
  if (axis === "x") {
    return [
      { value: rect.x, edge: "start" },
      { value: rect.x + rect.width / 2, edge: "center" },
      { value: rect.x + rect.width, edge: "end" },
    ];
  }

  return [
    { value: rect.y, edge: "start" },
    { value: rect.y + rect.height / 2, edge: "center" },
    { value: rect.y + rect.height, edge: "end" },
  ];
};

const guideForAxis = (axis: SnapAxis, position: number): AlignmentGuide => ({
  orientation: axis === "x" ? "vertical" : "horizontal",
  position,
});

const pageTargetsForAxis = (
  axis: SnapAxis,
  page: Pick<TemplateLayoutPage, "width" | "height">,
): SnapTarget[] => {
  const size = axis === "x" ? page.width : page.height;

  return [
    { value: 0, guide: guideForAxis(axis, 0), priority: 3 },
    { value: size / 2, guide: guideForAxis(axis, size / 2), priority: 3 },
    { value: size, guide: guideForAxis(axis, size), priority: 3 },
  ];
};

const blockTargetsForAxis = (
  axis: SnapAxis,
  blocks: TemplateLayoutBlock[],
  movingBlockIds: string[],
): SnapTarget[] => {
  const movingIdSet = new Set(movingBlockIds);

  return blocks
    .filter((block) => !movingIdSet.has(block.id))
    .flatMap((block) => {
      const values =
        axis === "x"
          ? [block.x, block.x + block.width / 2, block.x + block.width]
          : [block.y, block.y + block.height / 2, block.y + block.height];

      return uniqueNumbers(values).map((value) => ({
        value,
        guide: guideForAxis(axis, value),
        priority: 2,
      }));
    });
};

const gridTargetsForAxis = (
  axis: SnapAxis,
  page: Pick<TemplateLayoutPage, "width" | "height">,
  gridSize: number,
): SnapTarget[] => {
  const size = axis === "x" ? page.width : page.height;
  const targets: SnapTarget[] = [];

  for (let value = 0; value <= size; value += gridSize) {
    targets.push({
      value,
      guide: guideForAxis(axis, value),
      priority: 1,
    });
  }

  return targets;
};

const findSnapDelta = (anchors: SnapAnchor[], targets: SnapTarget[], tolerance: number) => {
  let best: { delta: number; distance: number; target: SnapTarget; anchor: SnapAnchor } | null = null;

  for (const anchor of anchors) {
    for (const target of targets) {
      const delta = target.value - anchor.value;
      const distance = Math.abs(delta);

      if (distance > tolerance) {
        continue;
      }

      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && target.priority > best.target.priority)
      ) {
        best = { delta, distance, target, anchor };
      }
    }
  }

  return best;
};

const snapAxis = (
  axis: SnapAxis,
  rect: AlignmentRect,
  options: SnapOptions,
): { delta: number; edge: SnapAnchor["edge"] | null; guide: AlignmentGuide | null } => {
  const tolerance = options.tolerance ?? SNAP_TOLERANCE;
  const gridSize = options.gridSize ?? GRID_SIZE;
  const targets: SnapTarget[] = [];

  if (options.snapToGrid) {
    targets.push(...gridTargetsForAxis(axis, options.page, gridSize));
  }

  if (options.snapToGuides) {
    targets.push(...pageTargetsForAxis(axis, options.page));
    targets.push(...blockTargetsForAxis(axis, options.blocks, options.movingBlockIds));
  }

  if (targets.length === 0) {
    return { delta: 0, edge: null, guide: null };
  }

  const snap = findSnapDelta(rectAnchorsForAxis(rect, axis), targets, tolerance);
  return snap
    ? { delta: snap.delta, edge: snap.anchor.edge, guide: snap.target.guide }
    : { delta: 0, edge: null, guide: null };
};

export const snapRect = (rect: AlignmentRect, options: SnapOptions): SnapResult => {
  const xSnap = snapAxis("x", rect, options);
  const ySnap = snapAxis("y", rect, options);
  const guides = [xSnap.guide, ySnap.guide].filter((guide): guide is AlignmentGuide => guide !== null);

  return {
    rect: {
      ...rect,
      x: rect.x + xSnap.delta,
      y: rect.y + ySnap.delta,
    },
    guides,
  };
};

const applyResizeDelta = (rect: AlignmentRect, axis: SnapAxis, delta: number, edge: SnapAnchor["edge"] | null) => {
  if (!edge || delta === 0) {
    return rect;
  }

  if (axis === "x") {
    if (edge === "start") {
      const width = Math.max(16, rect.width - delta);
      return { ...rect, x: rect.x + rect.width - width, width };
    }

    if (edge === "end") {
      return { ...rect, width: Math.max(16, rect.width + delta) };
    }

    return { ...rect, x: rect.x + delta };
  }

  if (edge === "start") {
    const height = Math.max(16, rect.height - delta);
    return { ...rect, y: rect.y + rect.height - height, height };
  }

  if (edge === "end") {
    return { ...rect, height: Math.max(16, rect.height + delta) };
  }

  return { ...rect, y: rect.y + delta };
};

export const snapResizedRect = (rect: AlignmentRect, options: SnapOptions): SnapResult => {
  const xSnap = snapAxis("x", rect, options);
  const ySnap = snapAxis("y", rect, options);
  const guides = [xSnap.guide, ySnap.guide].filter((guide): guide is AlignmentGuide => guide !== null);

  return {
    rect: applyResizeDelta(applyResizeDelta(rect, "x", xSnap.delta, xSnap.edge), "y", ySnap.delta, ySnap.edge),
    guides,
  };
};

export const rectFromBlocks = (blocks: TemplateLayoutBlock[]): AlignmentRect | null => {
  if (blocks.length === 0) {
    return null;
  }

  const left = Math.min(...blocks.map((block) => block.x));
  const top = Math.min(...blocks.map((block) => block.y));
  const right = Math.max(...blocks.map((block) => block.x + block.width));
  const bottom = Math.max(...blocks.map((block) => block.y + block.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};
