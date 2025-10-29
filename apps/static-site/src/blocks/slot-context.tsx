"use client";
import { SlotContext as BaseSlotContext } from "@page-blocks/react-client";
import type { FC } from "react";
import { directory } from "@/components/directory";
import { createRemoteLoader } from "@page-blocks/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

interface SlotProps {
  context: Record<string, string>;
  name: string;
  children?: any;
  className?: string;
}

export const SlotContext = ((props: any) => {
  const options = { resolver: directory.resolver };
  const loader = createRemoteLoader(options as any);

  return (
    <QueryClientProvider client={queryClient}>
      <BaseSlotContext {...props} loader={loader} options={options}>
        {props.children}
      </BaseSlotContext>
    </QueryClientProvider>
  );
}) as any as FC<any>;
