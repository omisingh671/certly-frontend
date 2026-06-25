import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { TemplateFieldDto } from "@/api/types";
import { resolveCanvasAssetUrl } from "@/lib/asset-url";
import {
  type AlignmentGuide,
  type AlignmentRect,
  GRID_SIZE,
  rectFromBlocks,
  snapRect,
  snapResizedRect,
} from "@/features/templates/canvas-alignment";
import { loadCanvasImage } from "@/features/templates/canvas-image";
import { GridOverlay } from "@/features/templates/canvas-grid-overlay";
import { CanvasRulers, RULER_SIZE } from "@/features/templates/canvas-rulers";
import type { TemplateLayoutBlock, TemplateLayoutJson } from "@/features/templates/template-layout";
import { renderTemplateText, sampleValueForField, updateTemplateLayoutBlock } from "@/features/templates/template-layout";

type DesignCanvasProps = {
  layout: TemplateLayoutJson;
  fields: TemplateFieldDto[];
  editable?: boolean;
  selectedBlockIds?: string[];
  showRulers?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  snapToGuides?: boolean;
  onSelectBlock?: (blockId: string | null, options?: { toggle: boolean }) => void;
  onChangeLayout?: (layout: TemplateLayoutJson) => void;
};

const MIN_SCALE = 0.35;

const sampleQrCode = "CERT-71A42F6FF565";

type CanvasColors = {
  selectedStroke: string;
  border: string;
  elevated: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  primarySoft: string;
};

const readCanvasColors = (): CanvasColors => {
  if (typeof document === "undefined") {
    return {
      selectedStroke: "currentColor",
      border: "currentColor",
      elevated: "currentColor",
      surface: "currentColor",
      textPrimary: "currentColor",
      textSecondary: "currentColor",
      primarySoft: "transparent",
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();

  return {
    selectedStroke: token("--ds-primary"),
    border: token("--ds-border"),
    elevated: token("--ds-elevated"),
    surface: token("--ds-surface"),
    textPrimary: token("--ds-text-primary"),
    textSecondary: token("--ds-text-secondary"),
    primarySoft: token("--ds-primary-soft"),
  };
};

const getCoverCrop = (image: HTMLImageElement, width: number, height: number) => {
  const imageRatio = image.width / image.height;
  const blockRatio = width / height;

  if (imageRatio > blockRatio) {
    const cropWidth = image.height * blockRatio;
    return {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height,
    };
  }

  const cropHeight = image.width / blockRatio;
  return {
    x: 0,
    y: (image.height - cropHeight) / 2,
    width: image.width,
    height: cropHeight,
  };
};

const CanvasImageBlock = ({
  block,
  commonProps,
  onTransformEnd,
  colors,
}: {
  block: TemplateLayoutBlock;
  commonProps: {
    id: string;
    x: number;
    y: number;
    draggable: boolean;
    onClick: (event: Konva.KonvaEventObject<MouseEvent>) => false | void;
    onTap: () => false | void;
    onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => void;
    onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
    onTransform?: (event: Konva.KonvaEventObject<Event>) => void;
    ref: (node: Konva.Node | null) => void;
  };
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
  colors: CanvasColors;
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageUrl = useMemo(() => resolveCanvasAssetUrl(block.src), [block.src]);

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      return;
    }

    const img = loadCanvasImage(imageUrl, {
      onLoad: setImage,
      onError: () => setImage(null),
    });

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  let imageProps: {
    x: number;
    y: number;
    width: number;
    height: number;
    crop?: { x: number; y: number; width: number; height: number };
  } = {
    x: 0,
    y: 0,
    width: block.width,
    height: block.height,
  };

  if (image && block.objectFit === "contain") {
    const scale = Math.min(block.width / image.width, block.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    imageProps = {
      x: (block.width - width) / 2,
      y: (block.height - height) / 2,
      width,
      height,
    };
  }

  if (image && block.objectFit === "cover") {
    imageProps = {
      ...imageProps,
      crop: getCoverCrop(image, block.width, block.height),
    };
  }

  return (
    <Group {...commonProps} onTransformEnd={onTransformEnd}>
      <Rect width={block.width} height={block.height} fill="transparent" />
      {image ? (
        <KonvaImage
          image={image}
          {...imageProps}
          opacity={block.opacity}
          listening={false}
        />
      ) : (
        <>
          <Rect
            width={block.width}
            height={block.height}
            fill={colors.elevated}
            stroke={colors.border}
            strokeDash={[6, 4]}
            listening={false}
          />
          <Text
            text={block.src ? "Image unavailable" : "Image"}
            width={block.width}
            height={block.height}
            align="center"
            verticalAlign="middle"
            fontSize={14}
            fill={colors.textSecondary}
            listening={false}
          />
        </>
      )}
    </Group>
  );
};

const getTextFontStyle = (block: TemplateLayoutBlock): string => {
  const isBold = block.fontWeight >= 600;

  if (block.fontStyle === "italic") {
    return isBold ? "italic bold" : "italic";
  }

  return isBold ? "bold" : block.fontStyle;
};

const getBlockText = (
  block: TemplateLayoutBlock,
  fields: TemplateFieldDto[],
  sampleData: Record<string, unknown>,
): string => {
  if (block.type === "text") {
    return renderTemplateText(block.text ?? "", sampleData);
  }

  if (block.type === "qrCode") {
    return `${block.prefix}${sampleQrCode}`;
  }

  const field = fields.find((item) => item.name === block.field);

  if (field) {
    return `${block.prefix}${sampleValueForField(field)}`;
  }

  return block.field ? `${block.prefix}${block.field}` : "Select a field";
};

export const DesignCanvas = ({
  layout,
  fields,
  editable = false,
  selectedBlockIds = [],
  showRulers = false,
  showGrid = false,
  snapToGrid = false,
  snapToGuides = false,
  onSelectBlock,
  onChangeLayout,
}: DesignCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const dragStateRef = useRef<{
    ids: string[];
    leaderId: string;
    leaderStart: { x: number; y: number };
    selectionStart: AlignmentRect;
    nodeStarts: Map<string, { x: number; y: number }>;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(layout.page.width);
  const [colors, setColors] = useState<CanvasColors>(() => readCanvasColors());
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") {
      setColors(readCanvasColors());
      return;
    }

    const root = document.documentElement;
    const syncColors = () => setColors(readCanvasColors());
    const observer = new MutationObserver(syncColors);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    syncColors();

    return () => observer.disconnect();
  }, []);

  const rulerOffset = showRulers ? RULER_SIZE : 0;
  const stageWidth = layout.page.width + rulerOffset;
  const stageHeight = layout.page.height + rulerOffset;
  const scale = useMemo(() => Math.max(MIN_SCALE, Math.min(1, Math.max(0, containerWidth - 48) / stageWidth)), [containerWidth, stageWidth]);
  const selectedIdSet = useMemo(() => new Set(selectedBlockIds), [selectedBlockIds]);
  const selectedBlocks = useMemo(
    () => layout.blocks.filter((block) => selectedIdSet.has(block.id)),
    [layout.blocks, selectedIdSet],
  );
  const isAnySelectedLocked = useMemo(
    () => selectedBlocks.some((block) => block.isLocked),
    [selectedBlocks],
  );
  const selectedResizableBlock =
    selectedBlocks.length === 1 &&
    (selectedBlocks[0].type === "image" || selectedBlocks[0].type === "text") &&
    !selectedBlocks[0].isLocked
      ? selectedBlocks[0]
      : null;
  const sampleData = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, sampleValueForField(field)])),
    [fields],
  );
  const hasSnapping = snapToGrid || snapToGuides;

  const getSnapOptions = (movingBlockIds: string[]) => ({
    page: layout.page,
    blocks: layout.blocks,
    movingBlockIds,
    snapToGrid,
    snapToGuides,
    gridSize: GRID_SIZE,
  });

  const applyGuides = (guides: AlignmentGuide[]) => {
    setActiveGuides(guides);
  };

  useEffect(() => {
    if (!editable || !transformerRef.current) {
      return;
    }

    const selectedNodes = selectedBlockIds
      .map((blockId) => nodeRefs.current.get(blockId))
      .filter((node): node is Konva.Node => node !== undefined);
    transformerRef.current.nodes(selectedNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [editable, selectedBlockIds, layout.blocks]);

  const updateBlockPositions = (blockIds: string[]) => {
    const idSet = new Set(blockIds);
    onChangeLayout?.(
      {
        ...layout,
        blocks: layout.blocks.map((block) => {
          if (!idSet.has(block.id)) {
            return block;
          }

          const node = nodeRefs.current.get(block.id);

          return node
            ? {
                ...block,
                x: Math.round(node.x()),
                y: Math.round(node.y()),
              }
            : block;
        }),
      },
    );
  };

  const getDragIds = (blockId: string): string[] => {
    const ids = selectedIdSet.has(blockId) ? selectedBlockIds : [blockId];
    return ids.filter((id) => {
      const block = layout.blocks.find((b) => b.id === id);
      return block && !block.isLocked;
    });
  };

  const handleBlockDragStart = (blockId: string, node: Konva.Node) => {
    const ids = getDragIds(blockId);
    const nodeStarts = new Map<string, { x: number; y: number }>();
    const movingBlocks = layout.blocks.filter((block) => ids.includes(block.id));
    const selectionStart = rectFromBlocks(movingBlocks);

    if (!selectionStart) {
      return;
    }

    ids.forEach((id) => {
      const selectedNode = nodeRefs.current.get(id);
      if (selectedNode) {
        nodeStarts.set(id, { x: selectedNode.x(), y: selectedNode.y() });
      }
    });

    dragStateRef.current = {
      ids,
      leaderId: blockId,
      leaderStart: { x: node.x(), y: node.y() },
      selectionStart,
      nodeStarts,
    };
  };

  const handleBlockDragMove = (blockId: string, node: Konva.Node) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.leaderId !== blockId) {
      return;
    }

    const rawDeltaX = node.x() - dragState.leaderStart.x;
    const rawDeltaY = node.y() - dragState.leaderStart.y;
    const movedRect = {
      ...dragState.selectionStart,
      x: dragState.selectionStart.x + rawDeltaX,
      y: dragState.selectionStart.y + rawDeltaY,
    };
    const snapResult = hasSnapping
      ? snapRect(movedRect, getSnapOptions(dragState.ids))
      : { rect: movedRect, guides: [] };
    const deltaX = snapResult.rect.x - dragState.selectionStart.x;
    const deltaY = snapResult.rect.y - dragState.selectionStart.y;

    dragState.ids.forEach((id) => {
      const selectedNode = nodeRefs.current.get(id);
      const start = dragState.nodeStarts.get(id);
      if (selectedNode && start) {
        selectedNode.x(start.x + deltaX);
        selectedNode.y(start.y + deltaY);
      }
    });
    applyGuides(snapResult.guides);
    node.getLayer()?.batchDraw();
  };

  const handleBlockDragEnd = (blockId: string) => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    setActiveGuides([]);
    updateBlockPositions(dragState?.leaderId === blockId ? dragState.ids : [blockId]);
  };

  const getTransformedRect = (block: TemplateLayoutBlock, node: Konva.Node): AlignmentRect => ({
    x: node.x(),
    y: node.y(),
    width: Math.max(16, block.width * node.scaleX()),
    height: Math.max(16, block.height * node.scaleY()),
  });

  const handleBlockTransform = (block: TemplateLayoutBlock, node: Konva.Node) => {
    if (!hasSnapping) {
      setActiveGuides([]);
      return;
    }

    const snapResult = snapResizedRect(getTransformedRect(block, node), getSnapOptions([block.id]));
    applyGuides(snapResult.guides);
  };

  const updateBlockFrame = (block: TemplateLayoutBlock, node: Konva.Node) => {
    const frame = getTransformedRect(block, node);
    const snapResult = hasSnapping ? snapResizedRect(frame, getSnapOptions([block.id])) : { rect: frame, guides: [] };
    node.scaleX(1);
    node.scaleY(1);
    setActiveGuides([]);

    onChangeLayout?.(
      updateTemplateLayoutBlock(layout, block.id, {
        x: Math.round(snapResult.rect.x),
        y: Math.round(snapResult.rect.y),
        width: Math.max(16, Math.round(snapResult.rect.width)),
        height: Math.max(16, Math.round(snapResult.rect.height)),
      }),
    );
  };

  const handleStagePointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!editable || event.target !== event.target.getStage()) {
      return;
    }

    onSelectBlock?.(null);
  };

  const renderGuideLines = (guides: AlignmentGuide[]) =>
    guides.map((guide, index) =>
      guide.orientation === "vertical" ? (
        <Line
          key={`guide-${guide.orientation}-${guide.position}-${index}`}
          points={[guide.position, 0, guide.position, layout.page.height]}
          stroke={colors.selectedStroke}
          strokeWidth={1}
          dash={[6, 5]}
          listening={false}
        />
      ) : (
        <Line
          key={`guide-${guide.orientation}-${guide.position}-${index}`}
          points={[0, guide.position, layout.page.width, guide.position]}
          stroke={colors.selectedStroke}
          strokeWidth={1}
          dash={[6, 5]}
          listening={false}
        />
      ),
    );

  return (
    <div ref={containerRef} className="w-full overflow-auto border border-border bg-muted/20 p-4 flex justify-center">
      <div className="shrink-0 shadow-soft bg-surface border border-border/50">
        <Stage
        width={stageWidth * scale}
        height={stageHeight * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
      >
        {showRulers ? (
          <Layer listening={false}>
            <CanvasRulers pageWidth={layout.page.width} pageHeight={layout.page.height} />
          </Layer>
        ) : null}
        <Layer>
          <Group x={rulerOffset} y={rulerOffset}>
            <Rect
              x={0}
              y={0}
              width={layout.page.width}
              height={layout.page.height}
              fill={layout.page.background}
              stroke={colors.border}
              strokeWidth={1}
              listening={false}
            />
            {showGrid ? <GridOverlay width={layout.page.width} height={layout.page.height} /> : null}
            {snapToGuides ? renderGuideLines([
              { orientation: "vertical", position: layout.page.width / 2 },
              { orientation: "horizontal", position: layout.page.height / 2 },
            ]) : null}
            {layout.blocks.map((block) => {
            const commonProps = {
              id: block.id,
              x: block.x,
              y: block.y,
              draggable: editable && !block.isLocked,
              onClick: (event: Konva.KonvaEventObject<MouseEvent>) =>
                editable && onSelectBlock?.(block.id, { toggle: event.evt.shiftKey }),
              onTap: () => editable && onSelectBlock?.(block.id, { toggle: false }),
              onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => handleBlockDragStart(block.id, event.target),
              onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => handleBlockDragMove(block.id, event.target),
              onDragEnd: () => handleBlockDragEnd(block.id),
              onTransform: (event: Konva.KonvaEventObject<Event>) => handleBlockTransform(block, event.target),
              ref: (node: Konva.Node | null) => {
                if (node) {
                  nodeRefs.current.set(block.id, node);
                } else {
                  nodeRefs.current.delete(block.id);
                }
              },
            };

            if (block.type === "line") {
              return (
                <Line
                  key={block.id}
                  {...commonProps}
                  points={[0, 0, block.width, block.height]}
                  stroke={block.color}
                  strokeWidth={3}
                  lineCap="round"
                  hitStrokeWidth={18}
                />
              );
            }

            if (block.type === "rect") {
              return (
                <Rect
                  key={block.id}
                  {...commonProps}
                  width={block.width}
                  height={block.height}
                  stroke={block.color}
                  strokeWidth={block.borderWidth}
                  fill={block.fillColor}
                />
              );
            }

            if (block.type === "qr") {
              const cell = Math.max(4, Math.min(block.width, block.height) / 8);

              return (
                <Group key={block.id} {...commonProps}>
                  <Rect
                    width={block.width}
                    height={block.height}
                    fill={colors.surface}
                    stroke={colors.textPrimary}
                    strokeWidth={2}
                  />
                  <Rect x={cell} y={cell} width={cell * 2} height={cell * 2} fill={colors.textPrimary} />
                  <Rect x={block.width - cell * 3} y={cell} width={cell * 2} height={cell * 2} fill={colors.textPrimary} />
                  <Rect x={cell} y={block.height - cell * 3} width={cell * 2} height={cell * 2} fill={colors.textPrimary} />
                  <Rect x={block.width / 2 - cell} y={block.height / 2 - cell} width={cell * 2} height={cell * 2} fill={colors.textPrimary} />
                  <Text
                    text="QR"
                    width={block.width}
                    height={block.height}
                    align="center"
                    verticalAlign="middle"
                    fontSize={Math.max(10, Math.min(18, block.width / 5))}
                    fontStyle="bold"
                    fill={colors.textSecondary}
                  />
                </Group>
              );
            }

            if (block.type === "image") {
              return (
                <CanvasImageBlock
                  key={block.id}
                  block={block}
                  commonProps={commonProps}
                  onTransformEnd={(event) => updateBlockFrame(block, event.target)}
                  colors={colors}
                />
              );
            }

            return (
              <Text
                key={block.id}
                {...commonProps}
                text={getBlockText(block, fields, sampleData)}
                width={block.width}
                height={block.height}
                fontFamily={block.fontFamily}
                fontSize={block.fontSize}
                fontStyle={getTextFontStyle(block)}
                lineHeight={block.lineHeight}
                padding={block.padding}
                fill={block.color}
                align={block.align}
                verticalAlign={block.verticalAlign === "center" ? "middle" : "top"}
                onTransformEnd={(event) => updateBlockFrame(block, event.target)}
              />
            );
            })}
            {renderGuideLines(activeGuides)}
            {editable ? (
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                borderStroke={isAnySelectedLocked ? "#ef4444" : colors.selectedStroke}
                borderStrokeWidth={1.5}
                borderDash={isAnySelectedLocked ? [4, 4] : undefined}
                anchorSize={selectedResizableBlock ? 8 : 0}
                resizeEnabled={selectedResizableBlock !== null}
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                  "top-center",
                  "bottom-center",
                ]}
                boundBoxFunc={(_oldBox, newBox) => ({
                  ...newBox,
                  width: Math.max(16, newBox.width),
                  height: Math.max(16, newBox.height),
                })}
                ignoreStroke
              />
            ) : null}
          </Group>
        </Layer>
      </Stage>
      </div>
    </div>
  );
};
