import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export const Card = ({ children, className }: CardProps) => (
  <section
    className={cn(
      "surface-card rounded-[28px] border p-5 backdrop-blur transition-colors",
      className,
    )}
  >
    {children}
  </section>
);
