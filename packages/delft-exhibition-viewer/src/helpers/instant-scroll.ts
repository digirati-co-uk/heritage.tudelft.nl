export function scrollElementIntoViewInstantly(element: HTMLElement, options: ScrollIntoViewOptions = {}) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootScrollBehavior = root.style.scrollBehavior;
  const previousBodyScrollBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  element.scrollIntoView({ ...options, behavior: "auto" });

  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousRootScrollBehavior;
    body.style.scrollBehavior = previousBodyScrollBehavior;
  });
}
