import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "Avenir Next", "ui-sans-serif", "system-ui"],
        serif: ["Fraunces", "Canela", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#11100d",
          900: "#1b1915",
          800: "#292620",
          700: "#3a352c",
        },
        ivory: {
          50: "#fbfaf5",
          100: "#f5f0e5",
          200: "#e7decc",
        },
        dune: {
          50: "#f7f4ec",
          100: "#eee7d8",
          300: "#cbb990",
          500: "#9d7b3d",
        },
        emerald: {
          500: "#0c8f65",
          600: "#067450",
        },
      },
      boxShadow: {
        lift: "0 24px 70px rgba(17, 16, 13, 0.10)",
        hairline: "0 0 0 1px rgba(17, 16, 13, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
