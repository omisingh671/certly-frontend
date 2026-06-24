import { api } from "@/api";
import { useAuthStore } from "@/store/auth-store";

export const bootstrapSession = async (): Promise<void> => {
  useAuthStore.getState().setBootstrapping(true);

  try {
    const result = await api.auth.refresh();
    useAuthStore.getState().setSession(result.user, result.accessToken);
  } catch {
    useAuthStore.getState().clearSession();
  } finally {
    useAuthStore.getState().setBootstrapping(false);
  }
};
