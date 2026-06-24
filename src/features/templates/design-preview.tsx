import type { TemplateFieldDto } from "@/api/types";
import type { TemplateLayoutJson } from "@/features/templates/template-layout";
import { renderTemplateText } from "@/features/templates/template-layout";

const sampleValueForField = (field: TemplateFieldDto) => {
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

export const DesignPreview = ({
  layout,
  fields,
}: {
  layout: TemplateLayoutJson;
  fields: TemplateFieldDto[];
}) => {
  const sampleData = Object.fromEntries(fields.map((field) => [field.name, sampleValueForField(field)]));

  return (
    <div
      className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-border"
      style={{
        background: layout.page.background,
      }}
    >
      <div className="absolute inset-0 border-[18px] border-border" />
      {layout.blocks.length === 0 ? (
        <div className="flex h-full items-center justify-center px-8 text-center text-sm text-text-secondary">
          Add `page` and `blocks` in the layout JSON to see a live certificate preview.
        </div>
      ) : (
        layout.blocks.map((block, index) => {
          const field = fields.find((item) => item.name === block.field);
          const content =
            block.text !== null
              ? renderTemplateText(block.text, sampleData)
              : field
                ? `${block.prefix}${sampleValueForField(field)}`
                : block.field ?? "Unknown field";

          return (
            <div
              key={`${block.type}-${index}`}
              className="absolute max-w-[85%]"
              style={{
                left: `${block.x}px`,
                top: `${block.y}px`,
                width: `${block.width}px`,
                height: `${block.height}px`,
                fontSize: `${block.fontSize}px`,
                fontFamily: block.fontFamily,
                fontStyle: block.fontStyle,
                lineHeight: block.lineHeight,
                color: block.color,
                fontWeight: block.fontWeight,
                textAlign: block.align,
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                padding: `${block.padding}px`,
              }}
            >
              {content}
            </div>
          );
        })
      )}
    </div>
  );
};
