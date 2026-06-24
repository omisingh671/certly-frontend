import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type Toast = {
  id: number;
  title: string;
  tone: "success" | "error" | "info";
};

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 z-[60] flex w-full flex-col items-center gap-3 px-4 sm:items-end sm:right-4 sm:w-auto sm:max-w-sm sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "w-full rounded-3xl px-4 py-3 text-center text-sm font-medium text-primary-foreground shadow-panel sm:w-auto sm:text-left",
              toast.tone === "success" && "bg-success",
              toast.tone === "error" && "bg-danger",
              toast.tone === "info" && "bg-primary",
            )}
          >
            {toast.title}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};
