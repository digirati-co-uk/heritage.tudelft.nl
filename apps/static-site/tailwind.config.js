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
      typography: {
        DEFAULT: {
          css: {
            a: {
              "text-decoration": "none",
              "font-weight": "500",
            },
            "h1, h2, h3, h4, h5": {
              "font-weight": "500",
            },
            strong: {
              "font-weight": "500",
            },
            blockquote: {
              "font-weight": "normal",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
