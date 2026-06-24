import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useThemeStore } from "@/store/theme-store";

type ThemeToggleProps = {
  className?: string;
};

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={cn(
        "focus-ring inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-border bg-surface/70 p-1 text-text-secondary shadow-sm backdrop-blur transition hover:bg-elevated",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition",
          !isDark ? "bg-accent text-accent-foreground shadow-sm" : "text-text-secondary",
        )}
      >
        <Sun className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition",
          isDark
            ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent-soft"
            : "text-text-secondary",
        )}
      >
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );
};
