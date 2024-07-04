import { block } from "@page-blocks/react";
import { createElement } from 'react';
import { z } from "zod";

export const HeadingParagraph = block(
  {
    label: "Heading paragraph",
    props: z.object({
      heading: z.string().optional(),
      level: z.number().int().min(1).max(4).optional(),
      paragraph: z.string(),
      html: z.boolean().optional(),
      align: z.enum(["left", "center" ]),
    }),
    examples: [
      {
        label: "Heading paragraph",
        context: {},
        display: { width: 500 },
        props: {
          heading: "Heading",
          paragraph:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id dolor id nibh ultricies vehicula ut id elit.",
          align: "left"
        },
      },
    ],
  },
  function HeadingParagraph(props) {
    const level = props.level ? "h" + props.level : "h2"
    const align = props.align === "center" ? "text-center" : "text-left"
    return (
      <div className={`pb-5 prose md:prose-xl ${align === "text-center" ? "mx-auto" : ""}`}>
        {props.heading ? createElement(level, {}, props.heading) : null}
        <div className={`leading-snug ${align}`}>
          {props.html ? (
            <div dangerouslySetInnerHTML={{ __html: props.paragraph }} />
          ) : (
            props.paragraph
          )}
        </div>
      </div>
    );
  },
);
