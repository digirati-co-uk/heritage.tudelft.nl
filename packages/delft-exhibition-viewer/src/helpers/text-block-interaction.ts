export function isInteractiveElement(target: EventTarget | null) {
  return typeof Element !== "undefined" && target instanceof Element
    ? Boolean(target.closest("a, button, input, select, textarea, [contenteditable='true']"))
    : false;
}

export function hasSelectedText() {
  if (typeof window === "undefined") {
    return false;
  }

  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}
