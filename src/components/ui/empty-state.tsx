import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <Card className="border-dashed text-center">
    <div className="space-y-3 py-8">
      <p className="font-display text-xl font-semibold text-text-primary ">{title}</p>
      <p className="mx-auto max-w-lg text-sm text-text-secondary dark:text-text-secondary">{description}</p>
      {action}
    </div>
  </Card>
);
