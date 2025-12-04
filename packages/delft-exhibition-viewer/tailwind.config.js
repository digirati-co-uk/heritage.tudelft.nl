import { colors, typography } from "./src/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.{tsx,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--f-font)"],
        mono: ["var(--f-mono-font)"],
      },
      fontWeight: {
        normal: "400",
        bold: "500",
      },
      colors: colors,
      typography: typography,
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
