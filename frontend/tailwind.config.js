/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0284c7", // Sky/Medical Blue
          foreground: "#ffffff",
          dark: "#0369a1",
          light: "#e0f2fe",
        },
        secondary: {
          DEFAULT: "#0d9488", // Teal Accent
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Healthcare Risk Levels
        risk: {
          low: "#10b981",     // Emerald
          moderate: "#f59e0b",// Amber
          high: "#ef4444",    // Rose/Red
          critical: "#b91c1c",// Crimson
        },
        // Legacy support
        ink: "#0f2744",
        sea: "#1b6b93",
        mist: "#eef6f8",
        alert: "#9b1c1c",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        ui: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        card: "0 2px 12px -2px rgba(15, 23, 42, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
