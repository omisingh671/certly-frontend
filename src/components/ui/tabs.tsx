import { cn } from "@/lib/cn";

export type TabItem<T extends string> = {
  value: T;
  label: string;
};

export const Tabs = <T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-border shadow-soft">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={cn(
          "focus-ring cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
          value === item.value
            ? "bg-primary text-primary-foreground"
            : "text-text-secondary hover:bg-elevated hover:text-text-primary",
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
