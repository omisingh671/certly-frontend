import type { CertificateDto, TemplateFieldDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CertificateDataFormProps = {
  fields: TemplateFieldDto[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onSubmit: () => void;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
};

const inputTypeForField = (field: TemplateFieldDto): "date" | "email" | "number" | "text" => {
  if (field.type === "NUMBER") return "number";
  if (field.type === "DATE") return "date";
  if (field.type === "EMAIL") return "email";

  return "text";
};

const normalizeFieldValue = (field: TemplateFieldDto, value: string): string | number =>
  field.type === "NUMBER" ? Number(value) : value;

export const buildCertificateData = (
  fields: TemplateFieldDto[],
  values: Record<string, string>,
): Record<string, unknown> =>
  fields.reduce<Record<string, unknown>>((data, field) => {
    data[field.name] = normalizeFieldValue(field, values[field.name] ?? "");

    return data;
  }, {});

export const certificateDataToFormValues = (
  certificate: CertificateDto,
  fields: TemplateFieldDto[],
): Record<string, string> =>
  fields.reduce<Record<string, string>>((values, field) => {
    values[field.name] = String(certificate.data[field.name] ?? "");

    return values;
  }, {});

export const CertificateDataForm = ({
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel,
  pendingLabel,
  isPending,
}: CertificateDataFormProps) => (
  <div className="space-y-4">
    {fields.map((field) => (
      <Field key={field.id} label={field.name} hint={`${field.type}${field.required ? " · required" : ""}`}>
        <Input
          type={inputTypeForField(field)}
          value={values[field.name] ?? ""}
          onChange={(event) =>
            onChange({
              ...values,
              [field.name]: event.target.value,
            })
          }
        />
      </Field>
    ))}
    <Button onClick={onSubmit} disabled={isPending}>
      {isPending ? pendingLabel : submitLabel}
    </Button>
  </div>
);
