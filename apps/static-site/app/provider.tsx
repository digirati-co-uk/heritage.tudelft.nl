"use client";
import { QueryClient, QueryClientProvider } from "react-query";
import { VaultProvider } from "react-iiif-vault";

export const queryClient = new QueryClient();

export function Provider({ children }: any) {
  return (
    <VaultProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </VaultProvider>
  );
}
