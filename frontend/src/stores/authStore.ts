import { create } from "zustand";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "patient" | "doctor" | "admin";
}

interface AuthState {
  token: string | null;
  user: User | null;
  patientProfileId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User, patientProfileId?: number | null) => void;
  setUser: (user: User, patientProfileId?: number | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const TOKEN_KEY = "cardio_token";

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  return {
    token: initialToken,
    user: null,
    patientProfileId: null,
    isAuthenticated: !!initialToken,
    isLoading: !!initialToken,

    setAuth: (token, user, patientProfileId = null) => {
      localStorage.setItem(TOKEN_KEY, token);
      set({
        token,
        user,
        patientProfileId,
        isAuthenticated: true,
        isLoading: false,
      });
    },

    setUser: (user, patientProfileId = null) => {
      set({ user, patientProfileId, isAuthenticated: true, isLoading: false });
    },

    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      set({
        token: null,
        user: null,
        patientProfileId: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    setLoading: (isLoading) => set({ isLoading }),
  };
});
