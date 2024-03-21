import { block } from "@page-blocks/react";
import { z } from "zod";

export const HeadingParagraph = block(
  {
    label: "Heading paragraph",
    props: z.object({
      heading: z.string().optional(),
      paragraph: z.string(),
      html: z.boolean().optional(),
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
        },
      },
    ],
  },
  function HeadingParagraph(props) {
    return (
      <div className="pb-5 prose lg:prose-xl">
        {props.heading ? <h4>{props.heading}</h4> : null}
        <div className="leading-snug">
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
