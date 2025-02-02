import mitt from "mitt";
import { useCallback, useEffect, useState } from "react";

export const tableOfContentsEmitter = mitt<{
  change: string;
}>();

export function useHashValue(onChange?: (hashValue: string) => void) {
  const [hashValue, _setHashValue] = useState<string | null>(null);

  const setHashValue = useCallback((hashValue: string) => {
    if (hashValue) {
      tableOfContentsEmitter.emit("change", hashValue);
    }
  }, []);

  useEffect(() => {
    const hashChange = (newHashValue: string) => {
      _setHashValue(newHashValue);
      onChange?.(newHashValue);
    };

    const windowHashChange = () => {
      tableOfContentsEmitter.emit("change", window.location.hash.slice(1));
    };

    window.addEventListener("hashchange", windowHashChange);
    tableOfContentsEmitter.on("change", hashChange);

    return () => {
      window.removeEventListener("hashchange", windowHashChange);
      tableOfContentsEmitter.off("change", hashChange);
    };
  }, []);

  return [hashValue, setHashValue] as const;
}
