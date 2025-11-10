import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "**/*.tsx",
    "src/**/*.{tsx,ts}",
    "content/**/*.{md,mdx}",
    "../../packages/delft-exhibition-viewer/src/**/*.{tsx,ts,.css}",
    "node_modules/iiif-browser/**/*.{js,css}",
  ],
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
      colors: {
        // Background colors
        BackgroundPrimary: "var(--delft-bg-primary)",
        BackgroundSecondary: "var(--delft-bg-secondary)",
        BackgroundOverlay: "var(--delft-bg-overlay)",

        // Text colors
        TextPrimary: "var(--delft-text-primary)",
        TextSecondary: "var(--delft-text-secondary)",
        ImageCaption: "var(--delft-image-caption)",
        AnnotationSelected: "var(--delft-annotation-selected)",

        // UI elements
        ControlBar: "var(--delft-control-bar)",
        ControlBarBorder: "var(--delft-control-bar-border)",
        ControlHover: "var(--delft-control-hover)",

        ProgressBar: "var(--delft-progress-bar)",

        CloseBackground: "var(--delft-close-background)",
        CloseBackgroundHover: "var(--delft-close-background-hover)",
        CloseText: "var(--delft-close-text)",

        // Title elements
        TitleCard: "var(--delft-title-card)",
        TitleCardText: "var(--delft-title-card-text)",

        // Info blocks
        InfoBlock: "var(--delft-info-block)",
        InfoBlockText: "var(--delft-info-block-text)",

        // Viewer elements
        ViewerBackground: "var(--delft-viewer-background)",
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
  plugins: [typography],
};
