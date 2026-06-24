import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import type { SessionListDto } from "@/api/types";
import { SessionsPage } from "@/features/sessions/sessions-page";

const sessionList: SessionListDto = {
  items: [
    {
      id: "session-current",
      user: {
        id: "super-1",
        name: "Super Admin",
        email: "super@example.com",
        role: "SUPER_ADMIN",
      },
      createdAt: "2026-06-12T10:00:00.000Z",
      expiresAt: "2026-06-19T10:00:00.000Z",
      isCurrent: true,
    },
    {
      id: "session-admin",
      user: {
        id: "admin-1",
        name: "Course Admin",
        email: "admin@example.com",
        role: "ADMIN",
      },
      createdAt: "2026-06-12T11:00:00.000Z",
      expiresAt: "2026-06-19T11:00:00.000Z",
      isCurrent: false,
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

describe("sessions page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("protects the current session and confirms individual and global revocation", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.sessions, "list").mockResolvedValue(sessionList);
    const revoke = vi.spyOn(api.sessions, "revoke").mockResolvedValue(undefined);
    const revokeAll = vi.spyOn(api.sessions, "revokeAll").mockResolvedValue({ revoked: 1 });

    render(
      <AppProviders>
        <MemoryRouter>
          <SessionsPage />
        </MemoryRouter>
      </AppProviders>,
    );

    expect(await screen.findByText("Course Admin")).toBeInTheDocument();

    const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
    expect(revokeButtons[0]).toBeDisabled();
    expect(revokeButtons[1]).toBeEnabled();

    await user.click(revokeButtons[1]);
    expect(screen.getByText("Revoke session?")).toBeInTheDocument();
    expect(revoke).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Revoke session" }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("session-admin"));

    await user.click(screen.getByRole("button", { name: "Revoke all" }));
    expect(screen.getByText("Revoke all other sessions?")).toBeInTheDocument();
    expect(revokeAll).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Revoke all sessions" }));
    await waitFor(() => expect(revokeAll).toHaveBeenCalledTimes(1));
  });
});
