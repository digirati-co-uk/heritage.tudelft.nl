"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimpleViewerProvider, VaultProvider } from "react-iiif-vault";
import { Vault } from "@iiif/helpers/vault";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export const queryClient = new QueryClient();

export const vault = new Vault();

export function Provider({ children }: any) {
  return (
    <VaultProvider vault={vault}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </VaultProvider>
  );
}

export function ManifestLoaderInner(props: { manifest: any; children: any }) {
  const searchParams = useSearchParams();
  const canvasIdEnc = searchParams.get("canvasId");
  const canvasId = canvasIdEnc ? atob(canvasIdEnc) : undefined;

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(
      props.manifest.id,
      JSON.parse(JSON.stringify(props.manifest)),
    );
  }

  return (
    <SimpleViewerProvider
      manifest={props.manifest}
      pagingEnabled={false}
      startCanvas={canvasId}
    >
      {props.children}
    </SimpleViewerProvider>
  );
}

export function ManifestLoader(props: { manifest: any; children: any }) {
  return (
    <Suspense>
      <ManifestLoaderInner manifest={props.manifest}>
        {props.children}
      </ManifestLoaderInner>
    </Suspense>
  );
}
