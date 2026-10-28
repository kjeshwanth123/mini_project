import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_KEY = "cardio_theme";

export const useThemeStore = create<ThemeState>((set, get) => {
  const savedTheme = typeof window !== "undefined" ? (localStorage.getItem(THEME_KEY) as Theme) : null;
  const initialTheme: Theme = savedTheme || "light";

  if (typeof window !== "undefined") {
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const current = get().theme;
      const next: Theme = current === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set({ theme: next });
    },
    setTheme: (theme: Theme) => {
      localStorage.setItem(THEME_KEY, theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set({ theme });
    },
  };
});
