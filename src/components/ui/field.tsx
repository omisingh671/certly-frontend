import { ReactNode } from "react";

export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <label className="flex flex-col gap-2 text-sm text-text-secondary">
    <span className="font-medium text-text-primary">{label}</span>
    {children}
    {hint ? <span className="text-xs text-text-secondary/80">{hint}</span> : null}
  </label>
);
