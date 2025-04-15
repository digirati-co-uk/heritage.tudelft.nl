import mitt from "mitt";
import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";

export const tableOfContentsEmitter = mitt<{
  change: string;
}>();

const useStore = create<{
  hashValue: string | null;
  setHashValue: (hashValue: string) => void;
}>((set, get) => {
  return {
    hashValue: null as string | null,
    setHashValue: (hashValue: string) => {
      set({ hashValue });
    },
  };
});

export function useHashValue(onChange?: (hashValue: string) => void) {
  const { hashValue, setHashValue: _setHashValue } = useStore();

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
