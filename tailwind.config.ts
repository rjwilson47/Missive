import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Stationery fonts loaded via next/font/google in individual components.
      // Font CSS variables are applied at the component level, not globally.
      fontFamily: {
        crimson: ["var(--font-crimson-text)", "Georgia", "serif"],
        merriweather: ["var(--font-merriweather)", "Georgia", "serif"],
        lora: ["var(--font-lora)", "Georgia", "serif"],
        courier: ["var(--font-courier-prime)", "Courier New", "monospace"],
        caveat: ["var(--font-caveat)", "cursive"],
        opensans: ["var(--font-open-sans)", "Helvetica Neue", "sans-serif"],
      },
      colors: {
        // Minimal warm-white palette to evoke paper / stationery
        paper: {
          DEFAULT: "#faf9f7",
          warm: "#f5f3ef",
          dark: "#ede9e3",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#6b6560",
          faint: "#b5b0aa",
        },
        seal: {
          DEFAULT: "#c0392b", // envelope-seal red
          light: "#e74c3c",
        },
      },
      boxShadow: {
        envelope: "0 2px 8px 0 rgba(0,0,0,0.08)",
        card: "0 1px 4px 0 rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
