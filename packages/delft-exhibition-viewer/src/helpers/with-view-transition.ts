import { flushSync } from "react-dom";

export function withViewTransition(
  element: HTMLElement | null,
  fn: () => any,
  name: string,
  out = false,
  enabled = false,
) {
  if (
    (typeof document !== "undefined" && !document.startViewTransition) ||
    !enabled
  ) {
    return fn;
  }

  return (e: any) => {
    if (!element || typeof document === "undefined") return fn();
    if (!out) {
      element.style.viewTransitionName = name;
    }

    document
      .startViewTransition(() => {
        flushSync(fn);
        element.style.viewTransitionName = out ? name : "";
      })
      .finished.then(() => {
        if (out) {
          element.style.viewTransitionName = "";
        }
      });
  };
}
