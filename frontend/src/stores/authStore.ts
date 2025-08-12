import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { getCurrentUser } from "../services/userService";
import { User } from "../types/user";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchUserData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setNavigate: (navigate: (path: string) => void) => void;
}

// Global navigation function storage
let globalNavigate: ((path: string) => void) | null = null;

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        login: async (token: string) => {
          set({ isLoading: true });
          try {
            localStorage.setItem("access_token", token);
            set({ token });
            await get().fetchUserData();
          } catch (error) {
            console.error("Login failed:", error);
            get().logout();
          }
        },

        logout: () => {
          localStorage.removeItem("access_token");
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // Navigate to login page if navigation function is available
          if (globalNavigate) {
            globalNavigate("/login");
          }

          // Trigger logout event for other components that might be listening
          window.dispatchEvent(new CustomEvent("triggerLogout"));
        },

        setNavigate: (navigate: (path: string) => void) => {
          globalNavigate = navigate;
        },

        fetchUserData: async () => {
          const { token } = get();
          if (!token) {
            set({ isLoading: false });
            return;
          }

          try {
            const userData = await getCurrentUser();
            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            console.error("Failed to fetch user data:", error);
            get().logout();
          }
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          token: state.token,
          // Don't persist user data, it will be fetched on app load
        }),
      }
    ),
    { name: "auth-store" }
  )
);

// Initialize auth state on app load
export const initializeAuth = async () => {
  const { token, fetchUserData, setLoading } = useAuthStore.getState();

  if (token) {
    await fetchUserData();
  } else {
    setLoading(false);
  }
};
