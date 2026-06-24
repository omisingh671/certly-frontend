import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  BringToFront,
  ChevronDown,
  ChevronRight,
  Copy,
  Group,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Loader2,
  Minus,
  RotateCcw,
  RotateCw,
  QrCode,
  Save,
  SendToBack,
  Square,
  Trash2,
  Type,
  Ungroup,
  Unlock,
  Variable,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useParams } from "react-router-dom";
import { api } from "@/api";
import type { TemplateFieldDto } from "@/api/types";
import { ApiClientError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { DesignCanvas } from "@/features/templates/design-canvas";
import {
  createTemplateLayoutBlock,
  defaultTemplateLayout,
  duplicateTemplateLayoutBlock,
  duplicateTemplateLayoutBlocks,
  groupTemplateLayoutBlocks,
  moveTemplateLayoutBlocksBy,
  normalizeTemplateLayout,
  pageDimensionsFor,
  parseTemplateLayoutEditorValue,
  removeTemplateLayoutBlocks,
  serializeTemplateLayout,
  moveTemplateLayoutBlockToBack,
  moveTemplateLayoutBlockToFront,
  moveTemplateLayoutBlocksToBack,
  moveTemplateLayoutBlocksToFront,
  ungroupTemplateLayoutBlocks,
  updateTemplateLayoutBlock,
  type TemplatePageOrientation,
  type TemplateLayoutBlock,
  type TemplateLayoutBlockType,
  type TemplateLayoutJson,
  type TemplateTextAlign,
  type TemplateVerticalAlign,
} from "@/features/templates/template-layout";

type TemplateDesignEditorProps = {
  templateId: string;
  embedded?: boolean;
};

export type TemplateDesignEditorHandle = {
  saveBeforeNavigation: () => Promise<boolean>;
};

const formatLayoutJson = (layout: TemplateLayoutJson): string =>
  JSON.stringify(serializeTemplateLayout(layout), null, 2);

const isDesignNotFound = (error: unknown): boolean =>
  error instanceof ApiClientError && error.code === "DESIGN_NOT_FOUND";

const numberFromInput = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getFirstFieldName = (fields: TemplateFieldDto[]): string | null => fields[0]?.name ?? null;

const ToolbarToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div className="flex h-8 items-center gap-1.5 rounded-2xl bg-surface px-1.5 text-xs font-semibold text-text-primary ring-1 ring-border">
    <Toggle size="sm" checked={checked} onChange={onChange} />
    <span>{label}</span>
  </div>
);

export const TemplateDesignEditor = forwardRef<TemplateDesignEditorHandle, TemplateDesignEditorProps>(function TemplateDesignEditor({ templateId, embedded = false }, ref) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const textBlockTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<TemplateLayoutJson>(defaultTemplateLayout);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [designEditorValue, setDesignEditorValue] = useState(formatLayoutJson(defaultTemplateLayout));
  const [savedDesignValue, setSavedDesignValue] = useState(formatLayoutJson(defaultTemplateLayout));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [historyPast, setHistoryPast] = useState<TemplateLayoutJson[]>([]);
  const [historyFuture, setHistoryFuture] = useState<TemplateLayoutJson[]>([]);
  const [showRulers, setShowRulers] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [isNavigationSavePending, setIsNavigationSavePending] = useState(false);
  const initializedTemplateIdRef = useRef<string | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const navigationSaveInProgressRef = useRef(false);

  const fieldsQuery = useQuery({
    queryKey: ["template-fields", templateId],
    queryFn: () => api.templates.fields(templateId),
  });

  const designQuery = useQuery({
    queryKey: ["template-design", templateId],
    queryFn: () => api.templates.getDesign(templateId),
    retry: false,
  });

  const fields = fieldsQuery.data ?? [];
  const hasUnsavedChanges = designEditorValue !== savedDesignValue;

  useEffect(() => {
    if (initializedTemplateIdRef.current === templateId) {
      return;
    }

    if (designQuery.data?.layoutJson) {
      const normalized = normalizeTemplateLayout(designQuery.data.layoutJson);
      const serialized = formatLayoutJson(normalized);
      setLayout(normalized);
      setDesignEditorValue(serialized);
      setSavedDesignValue(serialized);
      setJsonError(null);
      setSelectedBlockIds([]);
      setHistoryPast([]);
      setHistoryFuture([]);
      initializedTemplateIdRef.current = templateId;
      return;
    }

    if (isDesignNotFound(designQuery.error)) {
      setLayout(defaultTemplateLayout);
      const serialized = formatLayoutJson(defaultTemplateLayout);
      setDesignEditorValue(serialized);
      setSavedDesignValue(serialized);
      setJsonError(null);
      setSelectedBlockIds([]);
      setHistoryPast([]);
      setHistoryFuture([]);
      initializedTemplateIdRef.current = templateId;
    }
  }, [designQuery.data, designQuery.error, templateId]);

  const selectedBlocks = useMemo(
    () => layout.blocks.filter((block) => selectedBlockIds.includes(block.id)),
    [layout.blocks, selectedBlockIds],
  );
  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;
  const canGroupSelection =
    selectedBlockIds.length >= 2 &&
    !(
      selectedBlocks.length > 0 &&
      selectedBlocks.every((block) => block.groupId !== null && block.groupId === selectedBlocks[0].groupId)
    );
  const canUngroupSelection = selectedBlocks.some((block) => block.groupId !== null);

  const selectBlock = (blockId: string | null, options: { toggle: boolean } = { toggle: false }) => {
    if (blockId === null) {
      setSelectedBlockIds([]);
      return;
    }

    const block = layout.blocks.find((item) => item.id === blockId);
    if (!block) {
      return;
    }

    if (options.toggle) {
      setSelectedBlockIds((current) =>
        current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId],
      );
      return;
    }

    setSelectedBlockIds(
      block.groupId
        ? layout.blocks.filter((item) => item.groupId === block.groupId).map((item) => item.id)
        : [block.id],
    );
  };

  const syncLayout = useCallback((nextLayout: TemplateLayoutJson) => {
    setLayout(nextLayout);
    setDesignEditorValue(formatLayoutJson(nextLayout));
    setJsonError(null);
  }, []);

  const commitLayout = useCallback((nextLayout: TemplateLayoutJson) => {
    setHistoryPast((current) => [...current, layout]);
    setHistoryFuture([]);
    syncLayout(nextLayout);
  }, [layout, syncLayout]);

  const undoLayoutChange = () => {
    setHistoryPast((currentPast) => {
      const previousLayout = currentPast[currentPast.length - 1];

      if (!previousLayout) {
        return currentPast;
      }

      setHistoryFuture((currentFuture) => [layout, ...currentFuture]);
      syncLayout(previousLayout);
      setSelectedBlockIds((currentSelectedIds) =>
        currentSelectedIds.filter((id) => previousLayout.blocks.some((block) => block.id === id)),
      );

      return currentPast.slice(0, -1);
    });
  };

  const redoLayoutChange = () => {
    setHistoryFuture((currentFuture) => {
      const nextLayout = currentFuture[0];

      if (!nextLayout) {
        return currentFuture;
      }

      setHistoryPast((currentPast) => [...currentPast, layout]);
      syncLayout(nextLayout);
      setSelectedBlockIds((currentSelectedIds) =>
        currentSelectedIds.filter((id) => nextLayout.blocks.some((block) => block.id === id)),
      );

      return currentFuture.slice(1);
    });
  };

  const saveDesignMutation = useMutation({
    mutationFn: () => {
      if (jsonError) {
        throw new Error(jsonError);
      }

      return api.templates.saveDesign(templateId, serializeTemplateLayout(layout));
    },
    onSuccess: (result) => {
      const normalized = normalizeTemplateLayout(result.layoutJson);
      void queryClient.invalidateQueries({ queryKey: ["template-design", templateId] });
      syncLayout(normalized);
      setSavedDesignValue(formatLayoutJson(normalized));
      setHistoryPast([]);
      setHistoryFuture([]);
      pushToast({ title: "Design saved", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const persistDesign = useCallback(async (): Promise<boolean> => {
    if (jsonError) {
      pushToast({ title: "Fix the layout JSON before saving or leaving this design.", tone: "error" });
      return false;
    }

    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    const savePromise = saveDesignMutation.mutateAsync()
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        savePromiseRef.current = null;
      });
    savePromiseRef.current = savePromise;
    return savePromise;
  }, [jsonError, pushToast, saveDesignMutation]);

  const saveBeforeNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true;
    }

    setIsNavigationSavePending(true);
    try {
      return await persistDesign();
    } finally {
      setIsNavigationSavePending(false);
    }
  }, [hasUnsavedChanges, persistDesign]);

  useImperativeHandle(ref, () => ({ saveBeforeNavigation }), [saveBeforeNavigation]);

  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== "blocked" || navigationSaveInProgressRef.current) {
      return;
    }

    navigationSaveInProgressRef.current = true;
    void saveBeforeNavigation().then((saved) => {
      navigationSaveInProgressRef.current = false;
      if (saved) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, saveBeforeNavigation]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const uploadDesignImageMutation = useMutation({
    mutationFn: (file: File) => api.templates.uploadDesignImage(templateId, file),
    onSuccess: (result) => {
      const block = createTemplateLayoutBlock("image", {
        src: result.imageUrl,
        x: 80 + layout.blocks.length * 12,
        y: 80 + layout.blocks.length * 12,
      });
      commitLayout({ ...layout, blocks: [...layout.blocks, block] });
      setSelectedBlockIds([block.id]);
      pushToast({ title: "Image added", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const addBlock = (type: TemplateLayoutBlockType) => {
    const block = createTemplateLayoutBlock(type, {
      field: type === "field" ? getFirstFieldName(fields) : null,
      x: 80 + layout.blocks.length * 12,
      y: 80 + layout.blocks.length * 12,
    });
    commitLayout({ ...layout, blocks: type === "rect" ? [block, ...layout.blocks] : [...layout.blocks, block] });
    setSelectedBlockIds([block.id]);
  };

  const updateSelectedBlock = (patch: Partial<TemplateLayoutBlock>) => {
    if (!selectedBlock) {
      return;
    }

    commitLayout(updateTemplateLayoutBlock(layout, selectedBlock.id, patch));
  };

  const insertFieldIntoSelectedText = (fieldName: string) => {
    if (!selectedBlock || selectedBlock.type !== "text" || !fieldName) {
      return;
    }

    const token = `{{${fieldName}}}`;
    const currentText = selectedBlock.text ?? "";
    const textarea = textBlockTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const nextText = `${currentText.slice(0, selectionStart)}${token}${currentText.slice(selectionEnd)}`;
    const nextCursor = selectionStart + token.length;

    commitLayout(updateTemplateLayoutBlock(layout, selectedBlock.id, { text: nextText }));

    window.requestAnimationFrame(() => {
      textBlockTextareaRef.current?.focus();
      textBlockTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const deleteSelectedBlocks = useCallback(() => {
    if (selectedBlockIds.length === 0 || selectedBlocks.some((b) => b.isLocked)) {
      return;
    }

    commitLayout(removeTemplateLayoutBlocks(layout, selectedBlockIds));
    setSelectedBlockIds([]);
  }, [commitLayout, layout, selectedBlockIds, selectedBlocks]);

  const toggleLockSelectedBlocks = () => {
    if (selectedBlockIds.length === 0) {
      return;
    }
    const anyLocked = selectedBlocks.some((b) => b.isLocked);
    commitLayout({
      ...layout,
      blocks: layout.blocks.map((block) =>
        selectedBlockIds.includes(block.id) ? { ...block, isLocked: !anyLocked } : block
      ),
    });
  };

  const duplicateSelectedBlocks = () => {
    if (selectedBlockIds.length === 0) {
      return;
    }

    const result =
      selectedBlockIds.length === 1
        ? (() => {
            const duplicated = duplicateTemplateLayoutBlock(layout, selectedBlockIds[0]);
            return { layout: duplicated.layout, duplicatedIds: duplicated.duplicatedId ? [duplicated.duplicatedId] : [] };
          })()
        : duplicateTemplateLayoutBlocks(layout, selectedBlockIds);
    commitLayout(result.layout);
    setSelectedBlockIds(result.duplicatedIds);
  };

  const sendSelectedBlocksToBack = () => {
    if (selectedBlockIds.length === 0) {
      return;
    }

    commitLayout(
      selectedBlockIds.length === 1
        ? moveTemplateLayoutBlockToBack(layout, selectedBlockIds[0])
        : moveTemplateLayoutBlocksToBack(layout, selectedBlockIds),
    );
  };

  const bringSelectedBlocksToFront = () => {
    if (selectedBlockIds.length === 0) {
      return;
    }

    commitLayout(
      selectedBlockIds.length === 1
        ? moveTemplateLayoutBlockToFront(layout, selectedBlockIds[0])
        : moveTemplateLayoutBlocksToFront(layout, selectedBlockIds),
    );
  };

  const groupSelectedBlocks = () => {
    if (!canGroupSelection) {
      return;
    }

    const result = groupTemplateLayoutBlocks(layout, selectedBlockIds);
    commitLayout(result.layout);
    setSelectedBlockIds(selectedBlockIds);
  };

  const ungroupSelectedBlocks = () => {
    if (!canUngroupSelection) {
      return;
    }

    commitLayout(ungroupTemplateLayoutBlocks(layout, selectedBlockIds));
  };

  const setSelectedImageAsBackground = () => {
    if (!selectedBlock || selectedBlock.type !== "image") {
      return;
    }

    const resizedLayout = updateTemplateLayoutBlock(layout, selectedBlock.id, {
      x: 0,
      y: 0,
      width: layout.page.width,
      height: layout.page.height,
      objectFit: "cover",
    });
    commitLayout(moveTemplateLayoutBlockToBack(resizedLayout, selectedBlock.id));
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    uploadDesignImageMutation.mutate(file);
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || selectedBlockIds.length === 0) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedBlocks();
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const delta = deltas[event.key];

      if (!delta) {
        return;
      }

      event.preventDefault();
      commitLayout(moveTemplateLayoutBlocksBy(layout, selectedBlockIds, delta));
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commitLayout, deleteSelectedBlocks, layout, selectedBlockIds]);

  const updatePage = (patch: Partial<TemplateLayoutJson["page"]>) => {
    commitLayout({
      ...layout,
      page: {
        ...layout.page,
        ...patch,
      },
    });
  };

  const updatePageOrientation = (orientation: TemplatePageOrientation) => {
    commitLayout({
      ...layout,
      page: {
        ...layout.page,
        orientation,
        ...pageDimensionsFor(orientation),
      },
    });
  };

  const handleJsonEditorChange = (value: string) => {
    setDesignEditorValue(value);

    try {
      const normalized = normalizeTemplateLayout(parseTemplateLayoutEditorValue(value));
      setHistoryPast((current) => [...current, layout]);
      setHistoryFuture([]);
      setLayout(normalized);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid layout JSON");
    }
  };

  if (!templateId) {
    return <EmptyState title="Template not found" description="A template id is required to edit this design." />;
  }

  if (fieldsQuery.isLoading || designQuery.isLoading) {
    return <Card>Loading design workspace...</Card>;
  }

  if (fieldsQuery.isError || (designQuery.isError && !isDesignNotFound(designQuery.error))) {
    const message =
      fieldsQuery.error?.message ?? designQuery.error?.message ?? "Failed to load design workspace";
    return <EmptyState title="Design unavailable" description={message} />;
  }

  return (
    <div className="space-y-5">
      {!embedded ? (
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-display text-3xl font-semibold text-text-primary">Template design</p>
              <p className="text-sm text-text-secondary">Visual layout editor backed by saved layout JSON.</p>
            </div>
            <Button variant="success" onClick={() => saveDesignMutation.mutate()} disabled={saveDesignMutation.isPending || !!jsonError}>
              <Save className="h-4 w-4" />
              {saveDesignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card>
      ) : null}

      <div>
        <div className="grid gap-3">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-elevated">
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border bg-muted p-3">
              <ToolbarToggle
                label="Show Rulers"
                checked={showRulers}
                onChange={() => setShowRulers((current) => !current)}
              />
              <ToolbarToggle label="Show Grid" checked={showGrid} onChange={() => setShowGrid((current) => !current)} />
              <ToolbarToggle label="Snap Grid" checked={snapToGrid} onChange={() => setSnapToGrid((current) => !current)} />
              <ToolbarToggle
                label="Snap Guides"
                checked={snapToGuides}
                onChange={() => setSnapToGuides((current) => !current)}
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
              <Button className="h-8 px-2.5 text-xs" variant="secondary" onClick={() => addBlock("text")}>
                <Type className="h-4 w-4" />
                <span>Text</span>
              </Button>
              <Button
                className="h-8 px-2.5 text-xs"
                variant="secondary"
                onClick={() => addBlock("field")}
                disabled={fields.length === 0}
              >
                <Variable className="h-4 w-4" />
                <span>Field</span>
              </Button>
              <Button className="h-8 px-2.5 text-xs" variant="secondary" onClick={() => addBlock("line")}>
                <Minus className="h-4 w-4" />
                <span>Line</span>
              </Button>
              <Button className="h-8 px-2.5 text-xs" variant="secondary" onClick={() => addBlock("rect")}>
                <Square className="h-4 w-4" />
                <span>Rect</span>
              </Button>
              <Button className="h-8 px-2.5 text-xs" variant="secondary" onClick={() => addBlock("qr")}>
                <QrCode className="h-4 w-4" />
                <span>QR</span>
              </Button>
              <Button className="h-8 px-2.5 text-xs" variant="secondary" onClick={() => addBlock("qrCode")}>
                <KeyRound className="h-4 w-4" />
                <span>Code</span>
              </Button>
              <Button
                className="h-8 px-2.5 text-xs"
                variant="secondary"
                onClick={() => imageFileInputRef.current?.click()}
                disabled={uploadDesignImageMutation.isPending}
              >
                <ImageIcon className="h-4 w-4" />
                <span>{uploadDesignImageMutation.isPending ? "Uploading" : "Image"}</span>
              </Button>
              <div className="inline-flex h-8 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={undoLayoutChange}
                  disabled={historyPast.length === 0}
                  aria-label="Undo"
                  title="Undo"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <div className="my-2 w-px bg-muted" />
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={redoLayoutChange}
                  disabled={historyFuture.length === 0}
                  aria-label="Redo"
                  title="Redo"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="my-2 w-px bg-muted" />
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={duplicateSelectedBlocks}
                  disabled={selectedBlockIds.length === 0}
                  aria-label="Duplicate"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="inline-flex h-8 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={groupSelectedBlocks}
                  disabled={!canGroupSelection}
                >
                  <Group className="h-4 w-4" />
                  <span>Group</span>
                </Button>
                <div className="my-2 w-px bg-muted" />
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={ungroupSelectedBlocks}
                  disabled={!canUngroupSelection}
                >
                  <Ungroup className="h-4 w-4" />
                  <span>Ungroup</span>
                </Button>
              </div>
              <div className="inline-flex h-8 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={sendSelectedBlocksToBack}
                  disabled={selectedBlockIds.length === 0}
                >
                  <SendToBack className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <div className="my-2 w-px bg-muted" />
                <Button
                  className="h-8 rounded-none px-2.5 text-xs ring-0 hover:bg-elevated"
                  variant="ghost"
                  onClick={bringSelectedBlocksToFront}
                  disabled={selectedBlockIds.length === 0}
                >
                  <BringToFront className="h-4 w-4" />
                  <span>Front</span>
                </Button>
              </div>
              <Button
                className="h-8 px-2.5 text-xs"
                variant="secondary"
                onClick={toggleLockSelectedBlocks}
                disabled={selectedBlockIds.length === 0}
                aria-label={selectedBlocks.some((b) => b.isLocked) ? "Unlock Selected Elements" : "Lock Selected Elements"}
                title={selectedBlocks.some((b) => b.isLocked) ? "Unlock" : "Lock"}
              >
                {selectedBlocks.some((b) => b.isLocked) ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Lock</span>
                  </>
                )}
              </Button>
              <Button
                className="h-8 px-2.5 text-xs"
                variant="danger-soft"
                onClick={deleteSelectedBlocks}
                disabled={selectedBlockIds.length === 0 || selectedBlocks.some((b) => b.isLocked)}
                aria-label="Delete Selected Element"
                title="Delete Selected Element"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <DesignCanvas
            layout={layout}
            fields={fields}
            editable
            selectedBlockIds={selectedBlockIds}
            showRulers={showRulers}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            snapToGuides={snapToGuides}
            onSelectBlock={selectBlock}
            onChangeLayout={commitLayout}
          />
          <div
            className={`mt-4 flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold ${
              hasUnsavedChanges
                ? "border-warning/30 bg-accent-soft text-warning"
                : "border-success/25 bg-success-soft/35 text-success"
            }`}
            role="status"
            aria-live="polite"
          >
            {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          </div>
        </Card>

        <Card className="space-y-4">
          <Button
            variant="success"
            className="w-full h-11"
            onClick={() => void persistDesign()}
            disabled={saveDesignMutation.isPending || !!jsonError}
          >
            <Save className="h-4 w-4" />
            <span>{saveDesignMutation.isPending ? "Saving..." : "Save Design"}</span>
          </Button>

          <div className="rounded-3xl border border-border bg-elevated dark:border-border dark:bg-surface/75">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setPageSettingsOpen((current) => !current)}
            >
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Page Settings</span>
                <span className="text-sm font-semibold text-text-primary">
                  {layout.page.orientation} · {layout.page.width} x {layout.page.height}
                </span>
              </span>
              {pageSettingsOpen ? (
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              )}
            </button>

            {pageSettingsOpen ? (
              <div className="space-y-4 border-t border-border px-4 py-4 dark:border-border">
                <Field label="Orientation">
                  <Select
                    value={layout.page.orientation}
                    onChange={(event) => updatePageOrientation(event.target.value as TemplatePageOrientation)}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Width">
                    <Input
                      type="number"
                      min={1}
                      value={layout.page.width}
                      onChange={(event) =>
                        updatePage({ width: numberFromInput(event.target.value, layout.page.width) })
                      }
                    />
                  </Field>
                  <Field label="Height">
                    <Input
                      type="number"
                      min={1}
                      value={layout.page.height}
                      onChange={(event) =>
                        updatePage({ height: numberFromInput(event.target.value, layout.page.height) })
                      }
                    />
                  </Field>
                </div>
                <Field label="Background">
                  <Input
                    type="color"
                    className="h-11 p-1"
                    value={layout.page.background}
                    onChange={(event) => updatePage({ background: event.target.value })}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {selectedBlocks.length > 1 ? (
            <div className="space-y-3 rounded-3xl border border-primary/30 bg-primary-soft/70 p-4 shadow-sm  ">
              <div className="rounded-2xl bg-surface px-3 py-2 dark:bg-surface">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary ">Selected elements</p>
                <p className="text-sm font-semibold text-text-primary ">{selectedBlocks.length} items selected</p>
              </div>
              <p className="text-sm leading-6 text-text-secondary dark:text-text-secondary">
                Move selected items with drag or arrow keys. Use Group to keep them together, or Ungroup to edit grouped
                items separately.
              </p>
            </div>
          ) : selectedBlock ? (
            <div className="space-y-4 rounded-3xl border border-primary/30 bg-primary-soft/70 p-4 shadow-sm dark:border-primary/30 ">
              <div className="flex items-center justify-between rounded-2xl bg-surface px-3 py-2 dark:bg-surface">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary ">Selected element</p>
                  <p className="text-sm font-semibold text-text-primary ">{selectedBlock.type}</p>
                </div>
                <Button
                  variant={selectedBlock.isLocked ? "danger" : "secondary"}
                  className="h-8 px-2.5 text-xs"
                  onClick={toggleLockSelectedBlocks}
                >
                  {selectedBlock.isLocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      <span>Lock</span>
                    </>
                  )}
                </Button>
              </div>

              {selectedBlock.type === "text" ? (
                <div className="space-y-3">
                  <Field label="Text">
                    <Textarea
                      ref={textBlockTextareaRef}
                      className="min-h-[132px] resize-y"
                      value={selectedBlock.text ?? ""}
                      onChange={(event) => updateSelectedBlock({ text: event.target.value })}
                    />
                  </Field>
                  <Field label="Insert field">
                    <Select value="" onChange={(event) => insertFieldIntoSelectedText(event.target.value)}>
                      <option value="">Select field</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : null}

              {selectedBlock.type === "field" ? (
                <>
                  <Field label="Field key">
                    <Select
                      value={selectedBlock.field ?? ""}
                      onChange={(event) => updateSelectedBlock({ field: event.target.value || null })}
                    >
                      <option value="">Select field</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Prefix">
                    <Input
                      value={selectedBlock.prefix}
                      onChange={(event) => updateSelectedBlock({ prefix: event.target.value })}
                    />
                  </Field>
                </>
              ) : null}

              {selectedBlock.type === "qrCode" ? (
                <Field label="Prefix">
                  <Input
                    value={selectedBlock.prefix}
                    onChange={(event) => updateSelectedBlock({ prefix: event.target.value })}
                  />
                </Field>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="X">
                  <Input
                    type="number"
                    disabled={selectedBlock.isLocked}
                    value={selectedBlock.x}
                    onChange={(event) =>
                      updateSelectedBlock({ x: numberFromInput(event.target.value, selectedBlock.x) })
                    }
                  />
                </Field>
                <Field label="Y">
                  <Input
                    type="number"
                    disabled={selectedBlock.isLocked}
                    value={selectedBlock.y}
                    onChange={(event) =>
                      updateSelectedBlock({ y: numberFromInput(event.target.value, selectedBlock.y) })
                    }
                  />
                </Field>
                <Field label="Width">
                  <Input
                    type="number"
                    min={1}
                    disabled={selectedBlock.isLocked}
                    value={selectedBlock.width}
                    onChange={(event) =>
                      updateSelectedBlock({ width: numberFromInput(event.target.value, selectedBlock.width) })
                    }
                  />
                </Field>
                <Field label="Height">
                  <Input
                    type="number"
                    disabled={selectedBlock.isLocked}
                    value={selectedBlock.height}
                    onChange={(event) =>
                      updateSelectedBlock({ height: numberFromInput(event.target.value, selectedBlock.height) })
                    }
                  />
                </Field>
              </div>

              {selectedBlock.type === "image" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fit">
                      <Select
                        value={selectedBlock.objectFit}
                        onChange={(event) =>
                          updateSelectedBlock({
                            objectFit: event.target.value as TemplateLayoutBlock["objectFit"],
                          })
                        }
                      >
                        <option value="contain">Contain</option>
                        <option value="cover">Cover</option>
                        <option value="stretch">Stretch</option>
                      </Select>
                    </Field>
                    <Field label="Opacity">
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedBlock.opacity}
                        onChange={(event) =>
                          updateSelectedBlock({
                            opacity: Math.min(1, Math.max(0, numberFromInput(event.target.value, selectedBlock.opacity))),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Button className="w-full" variant="secondary" onClick={setSelectedImageAsBackground} disabled={selectedBlock.isLocked}>
                    Set As Background
                  </Button>
                </>
              ) : null}

              {selectedBlock.type === "rect" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Border color">
                      <Input
                        type="color"
                        className="h-11 p-1"
                        value={selectedBlock.color}
                        onChange={(event) => updateSelectedBlock({ color: event.target.value })}
                      />
                    </Field>
                    <Field label="Background color">
                      <Input
                        type="color"
                        className="h-11 p-1"
                        disabled={selectedBlock.fillColor === "transparent"}
                        value={selectedBlock.fillColor === "transparent" ? "#ffffff" : selectedBlock.fillColor}
                        onChange={(event) => updateSelectedBlock({ fillColor: event.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Border width">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={selectedBlock.borderWidth}
                      onChange={(event) =>
                        updateSelectedBlock({
                          borderWidth: Math.max(
                            0,
                            numberFromInput(event.target.value, selectedBlock.borderWidth),
                          ),
                        })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={selectedBlock.fillColor === "transparent"}
                      onChange={(event) =>
                        updateSelectedBlock({
                          fillColor: event.target.checked ? "transparent" : "#ffffff",
                        })
                      }
                    />
                    Transparent background
                  </label>
                </div>
              ) : null}

              {selectedBlock.type === "text" || selectedBlock.type === "field" || selectedBlock.type === "qrCode" ? (
                <>
                  <Field label="Font family">
                    <Select
                      value={selectedBlock.fontFamily}
                      onChange={(event) => updateSelectedBlock({ fontFamily: event.target.value })}
                    >
                      <option value="Inter, Arial, sans-serif">Inter</option>
                      <option value="&quot;Plus Jakarta Sans&quot;, Inter, sans-serif">Plus Jakarta Sans</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="&quot;Times New Roman&quot;, Times, serif">Times New Roman</option>
                    </Select>
                  </Field>

                  {selectedBlock.type === "text" || selectedBlock.type === "field" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Font size">
                        <Input
                          type="number"
                          min={8}
                          value={selectedBlock.fontSize}
                          onChange={(event) =>
                            updateSelectedBlock({
                              fontSize: numberFromInput(event.target.value, selectedBlock.fontSize),
                            })
                          }
                        />
                      </Field>
                      <Field label="Line height">
                        <Input
                          type="number"
                          min={0.8}
                          step={0.05}
                          value={selectedBlock.lineHeight}
                          onChange={(event) =>
                            updateSelectedBlock({
                              lineHeight: numberFromInput(event.target.value, selectedBlock.lineHeight),
                            })
                          }
                        />
                      </Field>
                    </div>
                  ) : (
                    <Field label="Font size">
                      <Input
                        type="number"
                        min={8}
                        value={selectedBlock.fontSize}
                        onChange={(event) =>
                          updateSelectedBlock({
                            fontSize: numberFromInput(event.target.value, selectedBlock.fontSize),
                          })
                        }
                      />
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Font weight">
                      <Select
                        value={selectedBlock.fontWeight}
                        onChange={(event) => updateSelectedBlock({ fontWeight: Number(event.target.value) })}
                      >
                        <option value={400}>400</option>
                        <option value={500}>500</option>
                        <option value={600}>600</option>
                        <option value={700}>700</option>
                      </Select>
                    </Field>
                    <Field label="Font style">
                      <Select
                        value={selectedBlock.fontStyle}
                        onChange={(event) => updateSelectedBlock({ fontStyle: event.target.value })}
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Alignment">
                      <Select
                        value={selectedBlock.align}
                        onChange={(event) =>
                          updateSelectedBlock({ align: event.target.value as TemplateTextAlign })
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </Select>
                    </Field>
                    <Field label="Vertical alignment">
                      <Select
                        value={selectedBlock.verticalAlign}
                        onChange={(event) =>
                          updateSelectedBlock({ verticalAlign: event.target.value as TemplateVerticalAlign })
                        }
                      >
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                      </Select>
                    </Field>
                  </div>
                </>
              ) : null}

              {selectedBlock.type !== "qr" && selectedBlock.type !== "image" && selectedBlock.type !== "rect" ? (
                <Field label="Color">
                  <Input
                    type="color"
                    className="h-11 p-1"
                    value={selectedBlock.color}
                    onChange={(event) => updateSelectedBlock({ color: event.target.value })}
                  />
                </Field>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No element selected" description="Select an element on the canvas to edit it." />
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-text-primary">Layout JSON</p>
            {jsonError ? <p className="text-sm text-danger">{jsonError}</p> : null}
          </div>
          <Button
            variant="secondary"
            onClick={() => handleJsonEditorChange(formatLayoutJson(layout))}
          >
            Normalize JSON
          </Button>
        </div>
        <Textarea
          className="min-h-[320px] font-mono text-xs"
          value={designEditorValue}
          onChange={(event) => handleJsonEditorChange(event.target.value)}
        />
      </Card>
      {isNavigationSavePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 backdrop-blur-sm" role="status" aria-live="assertive">
          <div className="surface-card flex items-center gap-3 rounded-3xl border px-6 py-5 text-lg font-semibold text-text-primary shadow-soft">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            Saving template design
          </div>
        </div>
      )}
    </div>
  );
});

export const TemplateDesignPage = () => {
  const { templateId = "" } = useParams();

  return <TemplateDesignEditor templateId={templateId} />;
};
