import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";

export const RequireAuth = () => {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "bootstrapping") {
    return <Skeleton className="m-8 h-48" />;
  }

  if (status === "anonymous") {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 2,
  ADMIN: 1,
};

export const RequireRole = ({ role }: { role: UserRole }) => {
  const user = useAuthStore((state) => state.user);

  if (!user || ROLE_LEVEL[user.role] < ROLE_LEVEL[role]) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
};
