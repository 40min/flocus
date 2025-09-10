import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { getCurrentUser } from "../services/userService";
import { User } from "../types/user";

interface AuthState {
  user: User | null;
  token: string | null;
  theme: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFetchingUserData: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchUserData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setNavigate: (navigate: (path: string) => void) => void;
  setTheme: (theme: string) => void;
}

// Global navigation function storage
let globalNavigate: ((path: string) => void) | null = null;

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        theme: 'summer',
        isAuthenticated: false,
        isLoading: true,
        isFetchingUserData: false,

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        login: async (token: string) => {
           set({ isLoading: true, isFetchingUserData: false });
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
             isFetchingUserData: false,
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

        setTheme: (theme: string) => {
          set({ theme });
        },

        fetchUserData: async () => {
           const { token, isFetchingUserData } = get();
           if (!token || isFetchingUserData) {
             if (!token) {
               set({ isLoading: false });
             }
             return;
           }

           set({ isFetchingUserData: true });
           try {
             const userData = await getCurrentUser();
             set({
               user: userData,
               theme: userData.preferences.theme || 'summer',
               isAuthenticated: true,
               isLoading: false,
               isFetchingUserData: false,
             });
           } catch (error) {
             console.error("Failed to fetch user data:", error);
             set({ isFetchingUserData: false });
             get().logout();
           }
         },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          token: state.token,
          theme: state.theme,
          // Don't persist user data or temporary flags, they will be fetched/reset on app load
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
