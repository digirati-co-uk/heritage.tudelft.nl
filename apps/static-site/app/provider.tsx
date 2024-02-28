"use client";
import { QueryClient, QueryClientProvider } from "react-query";
import { SimpleViewerProvider, VaultProvider } from "react-iiif-vault";
import { Vault } from "@iiif/helpers/vault";
import { useSearchParams } from "next/navigation";

export const queryClient = new QueryClient();

export const vault = new Vault();

export function Provider({ children }: any) {
  return (
    <VaultProvider vault={vault}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </VaultProvider>
  );
}

export function ManifestLoader(props: { manifest: any; children: any }) {
  const searchParams = useSearchParams();
  const canvasIdEnc = searchParams.get("canvasId");
  const canvasId = canvasIdEnc ? atob(canvasIdEnc) : undefined;

  if (props.manifest && props.manifest.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(props.manifest.id, props.manifest);
  }

  return (
    <SimpleViewerProvider manifest={props.manifest} pagingEnabled={false} startCanvas={canvasId}>
      {props.children}
    </SimpleViewerProvider>
  );
}
