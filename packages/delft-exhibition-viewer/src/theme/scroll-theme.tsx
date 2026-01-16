// This will handle the helpers for class names in the theme.

import type { CanvasNormalized, ManifestNormalized } from "@iiif/presentation-3-normalized";
import { createContext, useContext, useMemo } from "react";
import { useCanvas, useManifest } from "react-iiif-vault";

export type ScrollThemeOptions = {
  titleBlock?: {
    fullHeight?: boolean;
  };
};

function cn(...c: Array<string | null | false | undefined>) {
  return c.filter(Boolean).join(" ");
}

function useCreateScrollTheme(canvas: CanvasNormalized | undefined, options: ScrollThemeOptions) {
  const {
    titleBlock: { fullHeight = true } = {},
  } = options;

  const behavior = canvas?.behavior || [];

  // Temporary: for testing.
  const alternative = new URLSearchParams(window.location.search).get("alt") === "true";

  // Broken into sections that match the UI ordering and organisation.
  //
  //
  // TODO: Behaviours to parse:
  // - blur-background
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: Options are static.
  return useMemo(() => {
    return {
      titleBlock: {
        className: cn(
          //
          "exv-scroll-grid-title py-16 sm:py-20",
          fullHeight && "h-[90vh] flex items-center",
        ),
      },
      tourBlock: {
        useBlurBackground: alternative as boolean,
        viewerBackground: alternative ? "transparent" : undefined,
        viewerMargin: alternative as boolean,
      },
      annotationBlock: {
        className: cn(
          //
          "exv-scroll-annotation-container",
          "p-8 m-8 overflow-hidden drop-shadow-lg",
        ),
      },
      infoBlock: {
        className: cn(
          //
          "exv-scroll-info-block",
        ),
        innerClassName: "",
      },
    };
  }, []);
}

const ScrollThemeContext = createContext<ReturnType<typeof useCreateScrollTheme> | null>(null);

export function useScrollTheme() {
  const ctx = useContext(ScrollThemeContext);

  if (!ctx) {
    throw new Error("useScrollTheme must be used within a ScrollThemeProvider");
  }

  return ctx;
}

export function ScrollThemeProvider({
  children,
  options = {},
}: { children: React.ReactNode; options?: Partial<ScrollThemeOptions> }) {
  const canvas = useCanvas();
  const theme = useCreateScrollTheme(canvas!, options);

  return <ScrollThemeContext.Provider value={theme}> {children} </ScrollThemeContext.Provider>;
}
