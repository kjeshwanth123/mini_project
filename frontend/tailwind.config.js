/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f2744",
        sea: "#1b6b93",
        mist: "#eef6f8",
        alert: "#9b1c1c",
      },
      fontFamily: {
        sans: ["Source Serif 4", "Georgia", "serif"],
        ui: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
