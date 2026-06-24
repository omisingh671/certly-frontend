import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export const useQueryErrorToast = (isError: boolean, error: unknown, message: string) => {
  const { pushToast } = useToast();

  useEffect(() => {
    if (isError) {
      pushToast({ title: message, tone: "error" });
    }
  }, [isError, error, message, pushToast]);
};
