import { create } from "zustand";
import type { AuthUserDto } from "@/api/types";

type AuthStatus = "bootstrapping" | "authenticated" | "anonymous";

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUserDto | null;
  setBootstrapping: (value: boolean) => void;
  setSession: (user: AuthUserDto, accessToken: string) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "bootstrapping",
  accessToken: null,
  user: null,
  setBootstrapping: (value) =>
    set((state) => ({
      ...state,
      status: value ? "bootstrapping" : state.user === null ? "anonymous" : "authenticated",
    })),
  setSession: (user, accessToken) =>
    set({
      status: "authenticated",
      accessToken,
      user,
    }),
  clearSession: () =>
    set({
      status: "anonymous",
      accessToken: null,
      user: null,
    }),
}));
