import type { Reference } from "@iiif/presentation-3";
import { useContext, useMemo } from "react";
import { createContext } from "react";

export interface EditorHooks {
  canvasPreviewEditor?: (opt: { original: React.ReactNode }) => React.ReactNode;
  localeStringEditor?: (opt: { resource: Reference; property: string; original: React.ReactNode }) => React.ReactNode;
  annotationBodyEditor?: (opt: { resource: Reference<"Annotation">; original: React.ReactNode }) => React.ReactNode;
}

export const EditorHooksContext = createContext<EditorHooks>({});

export function EditorHooksProvider({ children, hooks }: { children: React.ReactNode; hooks?: EditorHooks }) {
  const existing = useContext(EditorHooksContext);
  const combined = useMemo(
    () => ({
      ...existing,
      ...(hooks || {}),
    }),
    [existing, hooks],
  );

  return <EditorHooksContext.Provider value={combined}>{children}</EditorHooksContext.Provider>;
}

type FuncArc<Func> = Func extends (arg0: infer T) => any ? T : never;

export function Hookable<Type extends keyof EditorHooks, Hook = FuncArc<EditorHooks[Type]>>({
  type,
  children,
  ...props
}: { type: keyof EditorHooks; children: React.ReactNode } & Exclude<Hook, "original">) {
  const hooks = useContext(EditorHooksContext);
  return hooks[type] ? hooks[type]({ ...props, original: children } as any) : null;
}
