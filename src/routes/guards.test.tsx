import { beforeEach, describe, expect, it } from "vitest";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { RequireAuth, RequireRole } from "@/routes/guards";
import { useAuthStore } from "@/store/auth-store";

const renderRouter = (element: React.ReactNode, initialEntries: string[] = ["/protected"]) => {
  const router = createMemoryRouter(
    [
      {
        path: "/login",
        element: <div>Login page</div>,
      },
      {
        path: "/",
        element: <div>Home page</div>,
      },
      {
        element,
        children: [
          {
            path: "/protected",
            element: <div>Protected page</div>,
          },
        ],
      },
    ],
    { initialEntries },
  );

  return render(<RouterProvider router={router} />);
};

describe("route guards", () => {
  beforeEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it("redirects anonymous users to login", async () => {
    renderRouter(<RequireAuth />);

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("renders protected routes for the required role", async () => {
    useAuthStore.getState().setSession(
      {
        id: "admin-1",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
        name: null,
        logoUrl: null,
      },
      "token",
    );

    renderRouter(<RequireRole role="SUPER_ADMIN" />);

    expect(await screen.findByText("Protected page")).toBeInTheDocument();
  });

  it("redirects admins away from Super Admin-only routes", async () => {
    useAuthStore.getState().setSession(
      {
        id: "admin-1",
        email: "admin@example.com",
        role: "ADMIN",
        name: null,
        logoUrl: null,
      },
      "token",
    );

    renderRouter(<RequireRole role="SUPER_ADMIN" />);

    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });
});
