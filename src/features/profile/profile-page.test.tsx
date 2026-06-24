import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import { ProfilePage } from "@/features/profile/profile-page";
import { useAuthStore } from "@/store/auth-store";

describe("profile page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession();
  });

  it("renders email as a read-only field", () => {
    useAuthStore.getState().setSession(
      {
        id: "super-1",
        email: "superadmin@cms.local",
        role: "SUPER_ADMIN",
        name: "Super Admin",
        logoUrl: null,
      },
      "token",
    );

    render(
      <AppProviders>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </AppProviders>,
    );

    const emailInput = screen.getByDisplayValue("superadmin@cms.local");

    expect(emailInput).toBeDisabled();
    expect(
      screen.getByText("Email changes must be completed by the Super Admin in the Users module."),
    ).toBeInTheDocument();
  });

  it("clears the session and redirects after changing the password", async () => {
    const user = userEvent.setup();
    const authUser = {
      id: "super-1",
      email: "superadmin@cms.local",
      role: "SUPER_ADMIN" as const,
      name: "Super Admin",
      logoUrl: null,
    };
    useAuthStore.getState().setSession(authUser, "token");
    vi.spyOn(api.auth, "updateMe").mockResolvedValue(authUser);

    render(
      <AppProviders>
        <MemoryRouter initialEntries={["/profile"]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    );

    await user.type(screen.getByPlaceholderText("••••••••"), "new-password");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});
