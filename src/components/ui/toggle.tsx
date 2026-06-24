import { cn } from "@/lib/cn";

type ToggleProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

export const Toggle = ({ checked, onChange, disabled = false, size = "md" }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={cn(
      "focus-ring relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
      size === "sm" ? "h-5 w-9" : "h-7 w-12",
      checked
        ? "bg-primary"
        : "bg-muted",
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block rounded-full bg-surface shadow-sm transition-transform duration-200",
        size === "sm"
          ? cn("h-3.5 w-3.5", checked ? "translate-x-[19px]" : "translate-x-[3px]")
          : cn("h-5 w-5", checked ? "translate-x-6" : "translate-x-1"),
      )}
    />
  </button>
);
