import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RequireAuth, RequireRole } from "@/routes/guards";
import { AdminLayout } from "@/components/app/admin-layout";

// Auth chunk
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((m) => ({ default: m.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/forgot-password-page").then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/reset-password-page").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const VerificationPage = lazy(() =>
  import("@/features/verification/verification-page").then((m) => ({
    default: m.VerificationPage,
  }))
);
const CredentialsPage = lazy(() =>
  import("@/features/credentials/credentials-page").then((m) => ({
    default: m.CredentialsPage,
  }))
);

// Admin chunk
const DashboardPage = lazy(() =>
  import("@/features/dashboard/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  }))
);
const TemplatesPage = lazy(() =>
  import("@/features/templates/templates-page").then((m) => ({
    default: m.TemplatesPage,
  }))
);
const TemplateDetailPage = lazy(() =>
  import("@/features/templates/template-detail-page").then((m) => ({
    default: m.TemplateDetailPage,
  }))
);
const TemplateDesignPage = lazy(() =>
  import("@/features/templates/template-design-editor").then((m) => ({
    default: m.TemplateDesignPage,
  }))
);
const BatchesPage = lazy(() =>
  import("@/features/batches/batches-page").then((m) => ({
    default: m.BatchesPage,
  }))
);
const BatchDetailPage = lazy(() =>
  import("@/features/batches/batch-detail-page").then((m) => ({
    default: m.BatchDetailPage,
  }))
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/notifications-page").then((m) => ({
    default: m.NotificationsPage,
  }))
);
const ProfilePage = lazy(() =>
  import("@/features/profile/profile-page").then((m) => ({
    default: m.ProfilePage,
  }))
);
const IntegrationsPage = lazy(() =>
  import("@/features/integrations/integrations-page").then((m) => ({
    default: m.IntegrationsPage,
  }))
);

// Super-admin chunk
const UsersPage = lazy(() =>
  import("@/features/users/users-page").then((m) => ({ default: m.UsersPage }))
);
const SessionsPage = lazy(() =>
  import("@/features/sessions/sessions-page").then((m) => ({
    default: m.SessionsPage,
  }))
);
const CertificateAuditPage = lazy(() =>
  import("@/features/certificate-audit/certificate-audit-page").then((m) => ({
    default: m.CertificateAuditPage,
  }))
);

const fallback = (
  <div className="flex h-screen items-center justify-center text-muted-foreground">
    Loading…
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={fallback}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <Suspense fallback={fallback}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <Suspense fallback={fallback}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/verify",
    element: (
      <Suspense fallback={fallback}>
        <VerificationPage />
      </Suspense>
    ),
  },
  {
    path: "/credentials",
    element: (
      <Suspense fallback={fallback}>
        <CredentialsPage />
      </Suspense>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: "/",
            element: (
              <Suspense fallback={fallback}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "/templates",
            element: (
              <Suspense fallback={fallback}>
                <TemplatesPage />
              </Suspense>
            ),
          },
          {
            path: "/templates/:templateId",
            element: (
              <Suspense fallback={fallback}>
                <TemplateDetailPage />
              </Suspense>
            ),
          },
          {
            path: "/admin/templates/:templateId/design",
            element: (
              <Suspense fallback={fallback}>
                <TemplateDesignPage />
              </Suspense>
            ),
          },
          {
            path: "/batches",
            element: (
              <Suspense fallback={fallback}>
                <BatchesPage />
              </Suspense>
            ),
          },
          {
            path: "/batches/:batchId",
            element: (
              <Suspense fallback={fallback}>
                <BatchDetailPage />
              </Suspense>
            ),
          },
          {
            path: "/notifications",
            element: (
              <Suspense fallback={fallback}>
                <NotificationsPage />
              </Suspense>
            ),
          },
          {
            path: "/profile",
            element: (
              <Suspense fallback={fallback}>
                <ProfilePage />
              </Suspense>
            ),
          },
          {
            element: <RequireRole role="SUPER_ADMIN" />,
            children: [
              {
                path: "/integrations",
                element: (
                  <Suspense fallback={fallback}>
                    <IntegrationsPage />
                  </Suspense>
                ),
              },
              {
                path: "/users",
                element: (
                  <Suspense fallback={fallback}>
                    <UsersPage />
                  </Suspense>
                ),
              },
              {
                path: "/sessions",
                element: (
                  <Suspense fallback={fallback}>
                    <SessionsPage />
                  </Suspense>
                ),
              },
              {
                path: "/certificate-audit",
                element: (
                  <Suspense fallback={fallback}>
                    <CertificateAuditPage />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);
