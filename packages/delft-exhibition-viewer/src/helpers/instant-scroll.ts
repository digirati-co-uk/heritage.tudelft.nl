export function scrollElementIntoViewInstantly(
  element: HTMLElement,
  options: ScrollIntoViewOptions = {},
  retryOptions: { frameCount?: number; settleDelayMs?: number } = {},
) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootScrollBehavior = root.style.scrollBehavior;
  const previousBodyScrollBehavior = body.style.scrollBehavior;
  const frameCount = retryOptions.frameCount ?? 8;
  const settleDelayMs = retryOptions.settleDelayMs ?? 250;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  const scroll = () => {
    if (element.isConnected) {
      element.scrollIntoView({ ...options, behavior: "auto" });
    }
  };

  const restoreScrollBehavior = () => {
    root.style.scrollBehavior = previousRootScrollBehavior;
    body.style.scrollBehavior = previousBodyScrollBehavior;
  };

  let frames = 0;
  const scrollOnNextFrame = () => {
    scroll();
    frames++;

    if (frames < frameCount) {
      window.requestAnimationFrame(scrollOnNextFrame);
      return;
    }

    window.setTimeout(() => {
      scroll();
      restoreScrollBehavior();
    }, settleDelayMs);
  };

  scroll();
  window.requestAnimationFrame(scrollOnNextFrame);
}
