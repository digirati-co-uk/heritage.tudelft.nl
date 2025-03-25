import { block } from "@page-blocks/react";
import { z } from "zod";
import { twMerge } from "tailwind-merge";

export const InfoBox = block(
  {
    label: "Info Box",
    props: z.object({
      title: z.string().optional(),
      content: z.string(),
      isHTML: z.boolean().optional(),
      large: z.boolean().optional(),
    }),
  },
  function InfoBox(props) {
    return (
      <div className={twMerge("cut-corners h-full bg-black p-6 text-white", props.large && "text-lg")}>
        <div className="flex flex-col items-center gap-4">
          {props.title ? <h1 className="my-3 text-center text-3xl font-medium">{props.title}</h1> : null}
          {props.isHTML ? (
            <div className="exhibition-info-block" dangerouslySetInnerHTML={{ __html: props.content }}></div>
          ) : (
            <div className="exhibition-info-block">{props.content}</div>
          )}
        </div>
      </div>
    );
  }
);
