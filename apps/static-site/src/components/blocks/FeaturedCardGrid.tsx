import { block, blockSlot } from "@page-blocks/react";
import { z } from "zod";

export const FeaturedCardGrid = block(
  {
    label: "Featured Card grid",
    props: z.object({
      title: z.string().optional(),
    }),
    examples: [
      {
        context: {},
        label: "Featured Card grid",
        props: {},
        slots: {
          gridItems: (
            <>
              <div className="bg-[red]" />
              <div className="bg-[blue]" />
              <div className="bg-[green]" />
              <div className="bg-[orange]" />
            </>
          ),
        },
      },
    ],
    slots: ["gridItems"],
  },
  function FeaturedCardGrid(props) {
    return (
      <div className="mb-12 mt-6">
        {props.title ? (
          <h3 className="my-12 place-items-center text-center text-3xl text-slate-800">
            {props.title}
          </h3>
        ) : null}
        {/* blockSlot(slot, htmlProps, fallback) */}
        {blockSlot(
          props.gridItems,
          { className: "featured-card-grid h-[700px]" },
          props.children || null,
        )}
      </div>
    );
  },
);
