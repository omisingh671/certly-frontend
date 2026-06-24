import { FormEvent, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { TemplateFieldDto, TemplateFieldType } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { TemplateDesignEditor, type TemplateDesignEditorHandle } from "@/features/templates/template-design-editor";

const fieldTypes: TemplateFieldType[] = ["TEXT", "NUMBER", "DATE", "EMAIL"];

export const TemplateDetailPage = () => {
  const { templateId = "" } = useParams();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<"fields" | "design">("design");
  const designEditorRef = useRef<TemplateDesignEditorHandle>(null);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<TemplateFieldDto | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: "", type: "TEXT" as TemplateFieldType, required: true });

  const templatesQuery = useQuery({
    queryKey: ["templates-all"],
    queryFn: () => api.templates.list(1, 100),
  });

  const fieldsQuery = useQuery({
    queryKey: ["template-fields", templateId],
    queryFn: () => api.templates.fields(templateId),
  });

  const template = templatesQuery.data?.items.find((item) => item.id === templateId) ?? null;
  const fields = fieldsQuery.data ?? [];

  const saveFieldMutation = useMutation({
    mutationFn: async () => {
      if (editingField) {
        return api.templates.updateField(templateId, editingField.id, fieldForm);
      }

      return api.templates.createField(templateId, fieldForm);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["template-fields", templateId] });
      setFieldModalOpen(false);
      setEditingField(null);
      setFieldForm({ name: "", type: "TEXT", required: true });
      pushToast({ title: "Template field saved", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) => api.templates.deleteField(templateId, fieldId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["template-fields", templateId] });
      pushToast({ title: "Field deleted", tone: "success" });
    },
    onError: (error) => pushToast({ title: error.message, tone: "error" }),
  });

  const openCreateField = () => {
    setEditingField(null);
    setFieldForm({ name: "", type: "TEXT", required: true });
    setFieldModalOpen(true);
  };

  const openEditField = (field: TemplateFieldDto) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      type: field.type,
      required: field.required,
    });
    setFieldModalOpen(true);
  };

  const handleFieldSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveFieldMutation.mutate();
  };

  const handleTabChange = async (nextTab: "fields" | "design") => {
    if (nextTab === activeTab) return;

    if (activeTab === "design" && nextTab !== "design") {
      const shouldLeave = await (designEditorRef.current?.confirmLeave() ?? Promise.resolve(true));
      if (!shouldLeave) return;
    }

    setActiveTab(nextTab);
  };

  if (!template) {
    return (
      <EmptyState
        title="Template not found"
        description="The requested template could not be resolved from the current API response."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-3xl font-semibold text-text-primary">{template.name}</p>
            <p className="text-sm text-text-secondary">{template.category ?? "No category assigned"}</p>
          </div>
          <Tabs
            items={[
              { value: "design", label: "Design" },
              { value: "fields", label: "Fields" },
            ]}
            value={activeTab}
            onChange={(nextTab) => { void handleTabChange(nextTab); }}
          />
        </div>
      </Card>

      {activeTab === "fields" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateField}>Add field</Button>
          </div>
          {fields.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <Card key={field.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-primary">{field.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">{field.type}</p>
                    </div>
                    <Badge tone={field.required ? "warning" : "neutral"}>{field.required ? "Required" : "Optional"}</Badge>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button variant="secondary" onClick={() => openEditField(field)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deleteFieldMutation.mutate(field.id)}
                      disabled={deleteFieldMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No fields defined"
              description="Add schema fields here, then use them in single issuance forms and the design preview."
              action={<Button onClick={openCreateField}>Create first field</Button>}
            />
          )}
        </div>
      ) : (
        <TemplateDesignEditor ref={designEditorRef} templateId={templateId} embedded />
      )}

      <Modal
        open={fieldModalOpen}
        title={editingField ? "Edit field" : "Create field"}
        onClose={() => setFieldModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleFieldSubmit}>
          <Field label="Field name">
            <Input
              value={fieldForm.name}
              onChange={(event) => setFieldForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Field type">
            <Select
              value={fieldForm.type}
              onChange={(event) =>
                setFieldForm((current) => ({ ...current, type: event.target.value as TemplateFieldType }))
              }
            >
              {fieldTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              checked={fieldForm.required}
              onChange={(event) => setFieldForm((current) => ({ ...current, required: event.target.checked }))}
              type="checkbox"
            />
            Required field
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFieldModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveFieldMutation.isPending}>
              {saveFieldMutation.isPending ? "Saving..." : "Save field"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
