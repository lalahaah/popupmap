import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16171B",
        paper: "#FAFAF7",
        card: "#FFFFFF",
        brandRed: "#FF3D57",
        brandYellow: "#FFC700",
        brandBlue: "#4C6FFF",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        sans: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
