import { block, blockSlot } from "@page-blocks/react";
import { z } from "zod";

const columns: Record<string, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};
export const CardGrid = block(
  {
    label: "Card grid",
    props: z.object({
      title: z.string().optional(),
      columns: z.number().min(2).max(6).optional(),
    }),
    slots: ["gridItems"],
  },
  function CardGrid(props) {
    const cols = columns[props.columns || 3] || columns[3];
    const gridClassName = `grid grid-cols-1 sm:grid-cols-2 ${cols} pb-grid-slot`;
    return (
      <div className="mt-6 mb-12">
        {props.title ? (
          <h3 className="text-slate-800 text-3xl my-12 text-center place-items-center">
            {props.title}
          </h3>
        ) : null}
        {/* blockSlot(slot, htmlProps, fallback) */}
        {blockSlot(
          props.gridItems,
          { className: gridClassName },
          props.children || null,
        )}
      </div>
    );
  },
);
