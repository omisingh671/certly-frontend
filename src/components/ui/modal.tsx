import { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  closeDisabled?: boolean;
}>;

export const Modal = ({ open, title, onClose, closeDisabled = false, children }: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 backdrop-blur-sm">
      <div className="surface-card w-full max-w-2xl rounded-[30px] border p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-text-primary">{title}</h2>
          <Button variant="secondary" onClick={onClose} disabled={closeDisabled}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};
