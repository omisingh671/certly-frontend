import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-elevated text-text-secondary ring-border",
  success: "bg-success-soft text-success ring-success/30",
  warning: "bg-accent-soft text-warning ring-warning/30",
  danger: "bg-danger-soft text-danger ring-danger/30",
  info: "bg-primary-soft text-primary ring-primary/30",
};

export const Badge = ({ children, tone = "neutral" }: { children: string; tone?: BadgeTone }) => (
  <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", tones[tone])}>
    {children}
  </span>
);
