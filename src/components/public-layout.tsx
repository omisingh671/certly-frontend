import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-primary/20 bg-[#0f0e3b] text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
            <img src="/certly-logo.png" alt="Certly" className="h-12 w-auto object-contain" />
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            {pathname !== "/verify" && (
              <Link to="/verify" className="text-xs text-slate-300 transition-colors hover:text-white hover:underline">
                Verify a certificate
              </Link>
            )}
            {pathname !== "/credentials" && (
              <Link to="/credentials" className="text-xs text-slate-300 transition-colors hover:text-white hover:underline">
                Access my certificates
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="border-t border-border/80 bg-surface/60 py-4 dark:border-border dark:bg-surface/60">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-text-secondary/80 dark:text-text-secondary">
          Copyright {new Date().getFullYear()} Certly | Secure Certificate Access
        </div>
      </footer>
    </div>
  );
};
