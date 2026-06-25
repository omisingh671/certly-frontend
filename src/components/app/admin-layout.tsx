import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuthStore } from "@/store/auth-store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import type { UserRole } from "@/api/types";
import {
  Bell,
  LayoutDashboard,
  Layers,
  GraduationCap,
  Cpu,
  Users,
  KeyRound,
  History,
  Search,
} from "lucide-react";

const segmentLabels: Record<string, string> = {
  "": "Dashboard",
  admin: "Admin",
  templates: "Templates",
  design: "Design",
  batches: "Batches",
  notifications: "Notifications",
  sessions: "Sessions",
  users: "Users",
  "certificate-audit": "Certificate Audit",
  profile: "Profile",
  integrations: "Integrations",
};

const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 2,
  ADMIN: 1,
};

const navigation = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/templates", label: "Templates", icon: Layers },
  { to: "/batches", label: "Batches", icon: GraduationCap },
  { to: "/integrations", label: "Integrations", icon: Cpu, minRole: "SUPER_ADMIN" as const },
  { to: "/users", label: "Users", icon: Users, minRole: "SUPER_ADMIN" as const },
  { to: "/sessions", label: "Sessions", icon: KeyRound, minRole: "SUPER_ADMIN" as const },
  {
    to: "/certificate-audit",
    label: "Certificate audit",
    icon: History,
    minRole: "SUPER_ADMIN" as const,
  },
];

const BrandLogo = ({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-start lg:items-center rounded-2xl lg:border lg:border-border lg:bg-elevated/80 lg:px-3 py-3 lg:shadow-sm lg:backdrop-blur dark:bg-surface/35",
      className,
    )}
  >
    <img
      src="/certly-logo.png"
      alt="Certly"
      className={cn(
        "h-auto w-full object-contain brightness-80 contrast-125 saturate-125 drop-shadow-sm dark:brightness-110 dark:contrast-100 dark:saturate-100",
        imageClassName,
      )}
    />
    <p className="mt-3 hidden text-xs font-medium text-text-secondary lg:block dark:text-text-secondary">
      Certificate operations, simplified.
    </p>
  </div>
);

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const segments = pathname.split("/").filter(Boolean);
  const batchId = segments[0] === "batches" && segments[1] ? segments[1] : null;
  const templateId =
    segments[0] === "templates" && segments[1]
      ? segments[1]
      : segments[0] === "admin" && segments[1] === "templates" && segments[2]
        ? segments[2]
        : null;
  const onTemplatePage = templateId !== null;

  const batchQuery = useQuery({
    queryKey: ["batch", batchId ?? ""],
    queryFn: () => api.batches.get(batchId!),
    enabled: !!batchId,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates-all"],
    queryFn: () => api.templates.list(1, 100),
    enabled: onTemplatePage,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications-badge"],
    queryFn: () => api.notifications.list({ page: 1, limit: 1 }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;

  const breadcrumbs = (() => {
    const crumbs: { label: string; to: string }[] = [
      { label: "Dashboard", to: "/" },
    ];
    let path = "";
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      path += `/${segment}`;
      let label = segmentLabels[segment];
      if (!label) {
        if (segments[i - 1] === "batches") {
          label = batchQuery.data?.name ?? segment.slice(0, 8) + "…";
        } else if (segments[i - 1] === "templates") {
          label =
            templatesQuery.data?.items.find((t) => t.id === segment)?.name ??
            segment.slice(0, 8) + "…";
        } else {
          label = segment.slice(0, 8) + "…";
        }
      }
      crumbs.push({ label, to: path });
    }
    return crumbs;
  })();

  const clearSession = useAuthStore((state) => state.clearSession);
  const { pushToast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: (_data, error) => {
      clearSession();
      pushToast({
        title: error
          ? "Signed out locally. Server session revocation could not be confirmed."
          : "Signed out successfully",
        tone: error ? "error" : "success",
      });
      navigate("/login");
    },
  });

  const sidebarContent = (
    <>
      <nav className="space-y-2">
        {navigation
          .filter(
            (item) =>
              !item.minRole ||
              (user
                ? ROLE_LEVEL[user.role] >= ROLE_LEVEL[item.minRole]
                : false),
          )
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-transparent text-text-secondary hover:bg-elevated hover:text-text-primary",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        <NavLink
          to="/verify"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-transparent text-text-secondary hover:bg-elevated hover:text-text-primary",
            )
          }
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Public verification</span>
        </NavLink>
      </nav>

      <div className="mt-auto ">
        <div className="mb-4 w-full lg:hidden">
          <ThemeToggle className="h-9" />
        </div>

        <div className="rounded-3xl border border-border bg-elevated p-4">
          <div className="flex gap-3">
            {user?.logoUrl ? (
              <img
                src={resolveAssetUrl(user.logoUrl) ?? undefined}
                alt="Logo"
                className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary shrink-0">
                {user?.name
                  ? user.name.slice(0, 2).toUpperCase()
                  : user?.email?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {user?.name ?? user?.email}
              </p>
              {user?.name && (
                <p className="truncate text-xs text-text-secondary/80">
                  {user.email}
                </p>
              )}
              <p className="text-xs text-text-secondary">{user?.role}</p>
            </div>
            <Link
              to="/profile"
              className="shrink-0 self-start mt-1 text-text-secondary/80 hover:text-primary transition-colors"
              title="Edit profile"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Link>
          </div>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-dvh overflow-hidden bg-grid bg-size-40px_40px transition-colors">
      {/* Mobile topbar */}
      <div className="lg:hidden flex h-16 items-center justify-between border-b border-border bg-surface px-4 text-text-primary">
        <BrandLogo className="w-42 px-2 py-1" imageClassName="max-h-10" />
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className={cn(
              "focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/70 text-text-secondary shadow-sm backdrop-blur transition hover:bg-elevated hover:text-text-primary",
              pathname === "/notifications" && "bg-primary text-primary-foreground border-primary shadow-soft"
            )}
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/70 text-text-secondary shadow-sm backdrop-blur transition hover:bg-elevated hover:text-text-primary"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-text-primary/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface px-5 py-6 text-text-primary shadow-2xl transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <BrandLogo className="w-44 px-2 py-1" imageClassName="max-h-10" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="focus-ring rounded-xl p-1.5 text-text-secondary/80 transition-colors hover:bg-elevated hover:text-text-primary"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="border-b border-border mb-6 shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col justify-between">
          {sidebarContent}
        </div>
      </aside>

      {/* Main grid (desktop sidebar + content) */}
      <div className="w-full mx-auto grid max-w-[1600px] gap-6 px-4 py-6 h-[calc(100dvh-4rem)] lg:h-screen lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="surface-card hidden flex-col rounded-4xl border px-5 py-6 text-text-primary shadow-panel lg:flex">
          <div className="mb-8 space-y-2 shrink-0">
            <BrandLogo className="w-full" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col justify-between">
            {sidebarContent}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col gap-4 lg:gap-6">
          {/* Desktop header — hidden on mobile */}
          <header
            className="surface-card hidden items-center justify-between gap-6 rounded-4xl border px-6 py-5 shadow-panel lg:flex hover:shadow-soft transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, var(--ds-surface) 0%, var(--ds-elevated) 55%, var(--ds-primary-soft) 100%)",
            }}
          >
            <div>
              <p className="font-display text-3xl font-semibold text-text-primary">
                Certly
              </p>
              {breadcrumbs.length > 1 && (
                <nav className="mt-2 flex items-center gap-1.5 text-xs">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={crumb.to} className="flex items-center gap-1.5">
                      {index > 0 && (
                        <span className="text-text-secondary/45">/</span>
                      )}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-primary">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          to={crumb.to}
                          className="text-text-secondary transition-colors hover:text-text-primary"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  ))}
                </nav>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className={cn(
                  "focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/70 text-text-secondary shadow-sm backdrop-blur transition hover:bg-elevated hover:text-text-primary",
                  pathname === "/notifications" && "bg-primary text-primary-foreground border-primary shadow-soft"
                )}
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <ThemeToggle />
            </div>
          </header>

          {/* Mobile breadcrumb — shown only when not on root */}
          {breadcrumbs.length > 1 && (
            <nav className="lg:hidden flex items-center gap-1.5 px-1 text-xs text-text-secondary ">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.to} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-text-secondary">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-primary">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.to}
                      className="text-text-secondary/80 transition-colors hover:text-text-secondary"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="flex-1 min-w-0 overflow-y-auto rounded-4xl border border-border bg-elevated/60 px-4 py-4 backdrop-blur-sm transition-colors lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
