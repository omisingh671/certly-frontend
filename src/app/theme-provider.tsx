import { PropsWithChildren, useEffect } from "react";
import { applyThemeToDocument, useThemeStore } from "@/store/theme-store";

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return <>{children}</>;
};
