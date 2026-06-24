import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline" | "danger-soft" | "warning" | "warning-outline" | "success" | "success-soft" | "success-outline" | "info-outline" | "neutral-outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover",
  secondary: "bg-surface text-text-primary ring-1 ring-border hover:bg-elevated",
  "neutral-outline": "bg-surface text-text-primary ring-2 ring-border hover:bg-elevated",
  ghost: "bg-transparent text-text-primary hover:bg-elevated",
  danger: "bg-danger text-primary-foreground hover:brightness-95",
  "danger-outline": "bg-surface text-danger ring-2 ring-danger/45 hover:bg-danger-soft",
  "danger-soft": "bg-danger-soft text-danger ring-1 ring-danger/30 hover:brightness-95",
  warning: "bg-accent text-accent-foreground hover:brightness-95",
  "warning-outline": "bg-surface text-warning ring-2 ring-warning/45 hover:bg-warning-soft",
  success: "bg-success text-primary-foreground hover:brightness-95",
  "success-soft": "bg-success-soft text-success hover:brightness-95",
  "success-outline": "bg-surface text-success ring-2 ring-success/45 hover:bg-success-soft",
  "info-outline": "bg-surface text-info ring-2 ring-info/45 hover:bg-info-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "focus-ring inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
