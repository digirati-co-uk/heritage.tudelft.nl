/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["src/**/*.{tsx,ts}", "content/**/*.{md,mdx}"],
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
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
