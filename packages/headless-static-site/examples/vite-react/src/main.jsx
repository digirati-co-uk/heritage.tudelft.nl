import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { VaultProvider } from "react-iiif-vault";
import { App } from "./App";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <VaultProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </VaultProvider>
  </React.StrictMode>,
);
