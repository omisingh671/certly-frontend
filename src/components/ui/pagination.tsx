import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    {pageSize !== undefined && onPageSizeChange !== undefined ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="focus-ring rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary outline-none transition focus:border-primary"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <div />
    )}
    <div className="flex items-center gap-3">
      <p className="text-sm text-text-secondary">
        Page {page} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  </div>
);
