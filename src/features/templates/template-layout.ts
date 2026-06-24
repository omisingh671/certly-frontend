import type { TemplateFieldDto } from "@/api/types";

export type TemplateLayoutBlockType = "text" | "field" | "line" | "rect" | "qr" | "qrCode" | "image";
export type TemplateTextAlign = "left" | "center" | "right";
export type TemplateVerticalAlign = "top" | "center";
export type TemplateImageFit = "contain" | "cover" | "stretch";
export type TemplatePageOrientation = "landscape" | "portrait";

export type TemplateLayoutGroup = {
  id: string;
  name: string;
};

export type TemplateLayoutPage = {
  size: string;
  orientation: string;
  background: string;
  width: number;
  height: number;
};

export type TemplateLayoutBlock = {
  id: string;
  type: TemplateLayoutBlockType;
  field: string | null;
  text: string | null;
  src: string | null;
  prefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  lineHeight: number;
  padding: number;
  color: string;
  fillColor: string;
  borderWidth: number;
  fontWeight: number;
  align: TemplateTextAlign;
  verticalAlign: TemplateVerticalAlign;
  objectFit: TemplateImageFit;
  opacity: number;
  groupId: string | null;
  isLocked?: boolean;
};

export type TemplateLayoutJson = {
  version: number;
  page: TemplateLayoutPage;
  groups: TemplateLayoutGroup[];
  blocks: TemplateLayoutBlock[];
};

const A4_LANDSCAPE = { width: 842, height: 595 };
const A4_PORTRAIT = { width: 595, height: 842 };
const DEFAULT_RECT_FILL_COLOR = "#ffffff";

export const defaultTemplateLayout: TemplateLayoutJson = {
  version: 1,
  page: {
    size: "A4",
    orientation: "landscape",
    background: "#f8fafc",
    ...A4_LANDSCAPE,
  },
  groups: [],
  blocks: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrDefault = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const nullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const numberOrDefault = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const alignOrDefault = (value: unknown): TemplateTextAlign => {
  if (value === "center" || value === "right") {
    return value;
  }

  return "left";
};

const verticalAlignOrDefault = (value: unknown): TemplateVerticalAlign =>
  value === "center" ? "center" : "top";

const imageFitOrDefault = (value: unknown): TemplateImageFit => {
  if (value === "cover" || value === "stretch") {
    return value;
  }

  return "contain";
};

const opacityOrDefault = (value: unknown): number => {
  const opacity = numberOrDefault(value, 1);
  return Math.min(1, Math.max(0, opacity));
};

export const renderTemplateText = (rawText: string, data: Record<string, unknown>): string =>
  rawText.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    const value = data[key];

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });

const blockTypeOrDefault = (value: unknown): TemplateLayoutBlockType => {
  if (
    value === "field" ||
    value === "line" ||
    value === "rect" ||
    value === "qr" ||
    value === "qrCode" ||
    value === "image"
  ) {
    return value;
  }

  return "text";
};

const createId = (prefix = "block"): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const orientationOrDefault = (value: unknown): TemplatePageOrientation =>
  value === "portrait" ? "portrait" : "landscape";

export const pageDimensionsFor = (orientation: TemplatePageOrientation, width?: unknown, height?: unknown) => {
  const defaults = orientation === "portrait" ? A4_PORTRAIT : A4_LANDSCAPE;

  return {
    width: numberOrDefault(width, defaults.width),
    height: numberOrDefault(height, defaults.height),
  };
};

export const parseTemplateLayoutEditorValue = (value: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(value);

  if (!isRecord(parsed)) {
    throw new Error("Layout JSON must be an object");
  }

  return parsed;
};

export const sampleValueForField = (field: TemplateFieldDto): string => {
  if (field.type === "DATE") {
    return "2026-04-08";
  }

  if (field.type === "EMAIL") {
    return "learner@example.com";
  }

  if (field.type === "NUMBER") {
    return "95";
  }

  return field.name.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
};

export const normalizeTemplateLayout = (value: unknown): TemplateLayoutJson => {
  if (!isRecord(value)) {
    return defaultTemplateLayout;
  }

  const page = isRecord(value.page) ? value.page : {};
  const orientation = orientationOrDefault(page.orientation);
  const dimensions = pageDimensionsFor(orientation, page.width, page.height);
  const groups = (Array.isArray(value.groups) ? value.groups : []).filter(isRecord).map((group, index) => ({
    id: stringOrDefault(group.id, `legacy-group-${index}`),
    name: stringOrDefault(group.name, `Group ${index + 1}`),
  }));
  const groupIds = new Set(groups.map((group) => group.id));
  const rawBlocks = Array.isArray(value.blocks) ? value.blocks : [];
  const blocks = rawBlocks.filter(isRecord).map((block, index): TemplateLayoutBlock => {
    const type = blockTypeOrDefault(block.type);
    const widthFallback = type === "line" ? 180 : type === "rect" ? 220 : type === "qr" ? 96 : type === "image" ? 240 : 280;
    const heightFallback = type === "line" ? 0 : type === "rect" ? 90 : type === "qr" ? 96 : type === "image" ? 160 : 40;

    return {
      id: stringOrDefault(block.id, `legacy-${index}-${type}`),
      type,
      field: nullableString(block.field) ?? nullableString(block.fieldKey),
      text: nullableString(block.text),
      src: nullableString(block.src) ?? nullableString(block.imageUrl),
      prefix: stringOrDefault(block.prefix, ""),
      x: numberOrDefault(block.x, 40),
      y: numberOrDefault(block.y, 40),
      width: numberOrDefault(block.width, widthFallback),
      height: numberOrDefault(block.height, heightFallback),
      fontSize: numberOrDefault(block.fontSize, type === "qrCode" ? 14 : 18),
      fontFamily: stringOrDefault(block.fontFamily, "Inter, Arial, sans-serif"),
      fontStyle: stringOrDefault(block.fontStyle, "normal"),
      lineHeight: numberOrDefault(block.lineHeight, 1.2),
      padding: numberOrDefault(block.padding, 0),
      color: stringOrDefault(block.color, "#132238"),
      fillColor: stringOrDefault(block.fillColor, type === "rect" ? DEFAULT_RECT_FILL_COLOR : "transparent"),
      borderWidth: Math.max(0, numberOrDefault(block.borderWidth, type === "rect" ? 3 : 0)),
      fontWeight: numberOrDefault(block.fontWeight, (type === "text" || type === "field" || type === "qrCode") ? 500 : 400),
      align: alignOrDefault(block.align),
      verticalAlign: verticalAlignOrDefault(block.verticalAlign),
      objectFit: imageFitOrDefault(block.objectFit),
      opacity: opacityOrDefault(block.opacity),
      groupId: groupIds.has(nullableString(block.groupId) ?? "") ? nullableString(block.groupId) : null,
      isLocked: typeof block.isLocked === "boolean" ? block.isLocked : false,
    };
  });

  return {
    version: numberOrDefault(value.version, defaultTemplateLayout.version),
    page: {
      size: stringOrDefault(page.size, defaultTemplateLayout.page.size),
      orientation,
      background: stringOrDefault(page.background, defaultTemplateLayout.page.background),
      ...dimensions,
    },
    groups,
    blocks,
  };
};

export const serializeTemplateLayout = (layout: TemplateLayoutJson): Record<string, unknown> => ({
  version: layout.version,
  page: {
    size: layout.page.size,
    orientation: layout.page.orientation,
    background: layout.page.background,
    width: layout.page.width,
    height: layout.page.height,
  },
  groups: layout.groups.map((group) => ({
    id: group.id,
    name: group.name,
  })),
  blocks: layout.blocks.map((block) => {
    const base = {
      id: block.id,
      type: block.type,
      groupId: block.groupId,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      color: block.color,
      isLocked: block.isLocked,
    };

    if (block.type === "image") {
      return {
        ...base,
        src: block.src,
        objectFit: block.objectFit,
        opacity: block.opacity,
      };
    }

    if (block.type === "line" || block.type === "rect" || block.type === "qr") {
      if (block.type === "rect") {
        return {
          ...base,
          fillColor: block.fillColor,
          borderWidth: block.borderWidth,
        };
      }

      return base;
    }

    return {
      ...base,
      text: block.type === "text" ? block.text ?? "" : null,
      field: block.type === "field" ? block.field : null,
      prefix: block.prefix,
      fontSize: block.fontSize,
      fontFamily: block.fontFamily,
      fontStyle: block.fontStyle,
      lineHeight: block.lineHeight,
      padding: block.padding,
      fontWeight: block.fontWeight,
      align: block.align,
      verticalAlign: block.verticalAlign,
    };
  }),
});

export const createTemplateLayoutBlock = (
  type: TemplateLayoutBlockType,
  input: Partial<TemplateLayoutBlock> = {},
): TemplateLayoutBlock => ({
  id: input.id ?? createId(type),
  type,
  field: type === "field" ? input.field ?? null : null,
  text: type === "text" ? input.text ?? "New text" : null,
  src: type === "image" ? input.src ?? null : null,
  prefix: input.prefix ?? (type === "qrCode" ? "qrCode: " : ""),
  x: input.x ?? 80,
  y: input.y ?? 80,
  width: input.width ?? (type === "line" ? 180 : type === "rect" ? 220 : type === "qr" ? 96 : type === "image" ? 240 : 280),
  height: input.height ?? (type === "line" ? 0 : type === "rect" ? 90 : type === "qr" ? 96 : type === "image" ? 160 : 40),
  fontSize: input.fontSize ?? (type === "qrCode" ? 14 : 18),
  fontFamily: input.fontFamily ?? "Inter, Arial, sans-serif",
  fontStyle: input.fontStyle ?? "normal",
  lineHeight: input.lineHeight ?? 1.2,
  padding: input.padding ?? 0,
  color: input.color ?? "#132238",
  fillColor: input.fillColor ?? (type === "rect" ? DEFAULT_RECT_FILL_COLOR : "transparent"),
  borderWidth: input.borderWidth ?? (type === "rect" ? 3 : 0),
  fontWeight: input.fontWeight ?? ((type === "text" || type === "field" || type === "qrCode") ? 500 : 400),
  align: input.align ?? "left",
  verticalAlign: input.verticalAlign ?? "top",
  objectFit: input.objectFit ?? "contain",
  opacity: input.opacity ?? 1,
  groupId: input.groupId ?? null,
  isLocked: input.isLocked ?? false,
});

export const createTemplateLayoutGroup = (index: number): TemplateLayoutGroup => ({
  id: createId("group"),
  name: `Group ${index + 1}`,
});

const cleanupUnusedGroups = (layout: TemplateLayoutJson): TemplateLayoutJson => {
  const usedGroupIds = new Set(layout.blocks.map((block) => block.groupId).filter((id): id is string => id !== null));

  return {
    ...layout,
    groups: layout.groups.filter((group) => usedGroupIds.has(group.id)),
  };
};

export const updateTemplateLayoutBlock = (
  layout: TemplateLayoutJson,
  blockId: string,
  patch: Partial<TemplateLayoutBlock>,
): TemplateLayoutJson => ({
  ...layout,
  blocks: layout.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
});

export const updateTemplateLayoutBlocks = (
  layout: TemplateLayoutJson,
  blockIds: string[],
  patch: Partial<TemplateLayoutBlock>,
): TemplateLayoutJson => {
  const idSet = new Set(blockIds);

  return {
    ...layout,
    blocks: layout.blocks.map((block) => (idSet.has(block.id) ? { ...block, ...patch } : block)),
  };
};

export const moveTemplateLayoutBlocksBy = (
  layout: TemplateLayoutJson,
  blockIds: string[],
  delta: { x: number; y: number },
): TemplateLayoutJson => {
  const idSet = new Set(blockIds);

  return {
    ...layout,
    blocks: layout.blocks.map((block) =>
      idSet.has(block.id) && !block.isLocked
        ? {
            ...block,
            x: block.x + delta.x,
            y: block.y + delta.y,
          }
        : block,
    ),
  };
};

export const removeTemplateLayoutBlock = (layout: TemplateLayoutJson, blockId: string): TemplateLayoutJson => ({
  ...layout,
  blocks: layout.blocks.filter((block) => block.id !== blockId),
});

export const removeTemplateLayoutBlocks = (layout: TemplateLayoutJson, blockIds: string[]): TemplateLayoutJson => {
  const idSet = new Set(blockIds);

  return cleanupUnusedGroups({
    ...layout,
    blocks: layout.blocks.filter((block) => !idSet.has(block.id)),
  });
};

export const duplicateTemplateLayoutBlock = (
  layout: TemplateLayoutJson,
  blockId: string,
): { layout: TemplateLayoutJson; duplicatedId: string | null } => {
  const block = layout.blocks.find((item) => item.id === blockId);

  if (!block) {
    return { layout, duplicatedId: null };
  }

  const duplicated = {
    ...block,
    id: createId(block.type),
    x: block.x + 24,
    y: block.y + 24,
    isLocked: false,
  };

  return {
    layout: {
      ...layout,
      blocks: [...layout.blocks, duplicated],
    },
    duplicatedId: duplicated.id,
  };
};

export const duplicateTemplateLayoutBlocks = (
  layout: TemplateLayoutJson,
  blockIds: string[],
): { layout: TemplateLayoutJson; duplicatedIds: string[] } => {
  const idSet = new Set(blockIds);
  const selectedBlocks = layout.blocks.filter((block) => idSet.has(block.id));

  if (selectedBlocks.length === 0) {
    return { layout, duplicatedIds: [] };
  }

  const selectedGroupIds = new Set(selectedBlocks.map((block) => block.groupId).filter(Boolean));
  const groupIdMap = new Map<string, string>();
  const newGroups: TemplateLayoutGroup[] = [];

  selectedGroupIds.forEach((groupId) => {
    if (!groupId) return;
    const sourceGroup = layout.groups.find((group) => group.id === groupId);
    const nextGroup = createTemplateLayoutGroup(layout.groups.length + newGroups.length);
    groupIdMap.set(groupId, nextGroup.id);
    newGroups.push({
      id: nextGroup.id,
      name: sourceGroup ? `${sourceGroup.name} copy` : nextGroup.name,
    });
  });

  const duplicatedBlocks = selectedBlocks.map((block) => ({
    ...block,
    id: createId(block.type),
    x: block.x + 24,
    y: block.y + 24,
    groupId: block.groupId ? groupIdMap.get(block.groupId) ?? null : null,
    isLocked: false,
  }));

  return {
    layout: {
      ...layout,
      groups: [...layout.groups, ...newGroups],
      blocks: [...layout.blocks, ...duplicatedBlocks],
    },
    duplicatedIds: duplicatedBlocks.map((block) => block.id),
  };
};

export const moveTemplateLayoutBlockToBack = (
  layout: TemplateLayoutJson,
  blockId: string,
): TemplateLayoutJson => {
  const block = layout.blocks.find((item) => item.id === blockId);

  if (!block) {
    return layout;
  }

  return {
    ...layout,
    blocks: [block, ...layout.blocks.filter((item) => item.id !== blockId)],
  };
};

export const moveTemplateLayoutBlocksToBack = (
  layout: TemplateLayoutJson,
  blockIds: string[],
): TemplateLayoutJson => {
  const idSet = new Set(blockIds);
  const selected = layout.blocks.filter((block) => idSet.has(block.id));

  if (selected.length === 0) {
    return layout;
  }

  return {
    ...layout,
    blocks: [...selected, ...layout.blocks.filter((block) => !idSet.has(block.id))],
  };
};

export const moveTemplateLayoutBlockToFront = (
  layout: TemplateLayoutJson,
  blockId: string,
): TemplateLayoutJson => {
  const block = layout.blocks.find((item) => item.id === blockId);

  if (!block) {
    return layout;
  }

  return {
    ...layout,
    blocks: [...layout.blocks.filter((item) => item.id !== blockId), block],
  };
};

export const moveTemplateLayoutBlocksToFront = (
  layout: TemplateLayoutJson,
  blockIds: string[],
): TemplateLayoutJson => {
  const idSet = new Set(blockIds);
  const selected = layout.blocks.filter((block) => idSet.has(block.id));

  if (selected.length === 0) {
    return layout;
  }

  return {
    ...layout,
    blocks: [...layout.blocks.filter((block) => !idSet.has(block.id)), ...selected],
  };
};

export const groupTemplateLayoutBlocks = (
  layout: TemplateLayoutJson,
  blockIds: string[],
): { layout: TemplateLayoutJson; groupId: string | null } => {
  if (blockIds.length < 2) {
    return { layout, groupId: null };
  }

  const group = createTemplateLayoutGroup(layout.groups.length);
  const groupedLayout = updateTemplateLayoutBlocks(
    {
      ...layout,
      groups: [...layout.groups, group],
    },
    blockIds,
    { groupId: group.id },
  );

  return { layout: groupedLayout, groupId: group.id };
};

export const ungroupTemplateLayoutBlocks = (
  layout: TemplateLayoutJson,
  blockIds: string[],
): TemplateLayoutJson => cleanupUnusedGroups(updateTemplateLayoutBlocks(layout, blockIds, { groupId: null }));
