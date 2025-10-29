import { CustomSlot } from "@page-blocks/react";
import type { FC } from "react";
import { fileSystemLoader } from "./server";
import { directory } from "@/components/directory";

interface SlotProps {
  context: Record<string, string>;
  name: string;
  children: any;
  className?: string;
}

export const Slot = (async (props: SlotProps) => {
  const slotResponse = await fileSystemLoader.query(props.context, [
    props.name,
  ]);
  const options = { resolver: directory.resolver, blocks: directory.blocks };

  return (
    <CustomSlot
      name={props.name}
      slot={(slotResponse.slots as any)[props.name]}
      context={props.context}
      options={options}
      slotHtmlProps={{ className: props.className }}
    >
      {props.children}
    </CustomSlot>
  );
}) as any as FC<SlotProps>;
