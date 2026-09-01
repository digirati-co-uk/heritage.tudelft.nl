const MODAL_REOPEN_SUPPRESSION_MS = 700;

let suppressModalOpenUntil = 0;

function getNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function stopModalEvent(event?: unknown) {
  const modalEvent = event as
    | {
        preventDefault?: () => void;
        stopPropagation?: () => void;
        nativeEvent?: { stopImmediatePropagation?: () => void };
      }
    | undefined;

  modalEvent?.preventDefault?.();
  modalEvent?.stopPropagation?.();
  modalEvent?.nativeEvent?.stopImmediatePropagation?.();
}

export function suppressModalOpen(event?: unknown) {
  stopModalEvent(event);
  suppressModalOpenUntil = Math.max(suppressModalOpenUntil, getNow() + MODAL_REOPEN_SUPPRESSION_MS);
}

export function isModalOpenSuppressed() {
  return getNow() < suppressModalOpenUntil;
}
