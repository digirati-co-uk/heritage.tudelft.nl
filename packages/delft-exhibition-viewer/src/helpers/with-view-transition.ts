import { flushSync } from "react-dom";

type ViewTransitionElement = HTMLElement | null | (() => HTMLElement | null);

function getTransitionElement(element: ViewTransitionElement) {
  return typeof element === "function" ? element() : element;
}

export function withViewTransition(
  element: ViewTransitionElement,
  fn: (event?: unknown) => any,
  name: string,
  out = false,
  enabled = false,
): (event?: unknown) => any {
  if (
    (typeof document !== "undefined" && !document.startViewTransition) ||
    !enabled
  ) {
    return fn;
  }

  return (event?: unknown) => {
    const transitionElement = getTransitionElement(element);
    if (!transitionElement || typeof document === "undefined") return fn(event);

    if (out) {
      transitionElement.style.viewTransitionName = "";
    }

    if (!out) {
      transitionElement.style.viewTransitionName = name;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => fn(event));
      transitionElement.style.viewTransitionName = out ? name : "";
    });

    transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (transitionElement.style.viewTransitionName === name) {
          transitionElement.style.viewTransitionName = "";
        }
      });
  };
}
