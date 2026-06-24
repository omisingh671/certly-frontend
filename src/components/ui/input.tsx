import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none ring-0 transition placeholder:text-text-secondary/65 focus:border-primary",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
