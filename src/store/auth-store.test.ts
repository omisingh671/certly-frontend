import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth-store";

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("stores an authenticated session", () => {
    useAuthStore.getState().setSession(
      {
        id: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        name: null,
        logoUrl: null,
      },
      "access-token",
    );

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().accessToken).toBe("access-token");
    expect(useAuthStore.getState().user?.role).toBe("ADMIN");
  });

  it("returns to anonymous after clearing the session", () => {
    useAuthStore.getState().setSession(
      {
        id: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        name: null,
        logoUrl: null,
      },
      "access-token",
    );

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
