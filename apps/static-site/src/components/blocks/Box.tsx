import { block } from "@page-blocks/react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import {
  boxCollectionSource,
  boxExhibitionSource,
  boxManifestSource,
  boxPublicationSource,
} from "@/blocks/sources/box-source";
import { twMerge } from "tailwind-merge";

const boxProps = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  type: z.string(),
  link: z.string(),
  backgroundColor: z
    .enum([
      "bg-orange-500",
      "bg-yellow-400",
      "bg-orange-400",
      "bg-green-500",
      "bg-blue-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-purple-400",
    ])
    .optional(),
  fullHeight: z.boolean().optional(),
  fallbackBackgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  dark: z.boolean().optional(),
  small: z.boolean().optional(),
  unfiltered: z.boolean().optional(),
  className: z.string().optional(),
});

export function Box(props: z.infer<typeof boxProps>) {
  const filters = props.unfiltered ? "" : "grayscale";
  const fallbackBackground = props.fallbackBackgroundColor || "bg-yellow-400";
  const titleSize = props.small ? "md:text-xl" : "text-2xl md:text-4xl";

  const fullHeight = props.fullHeight ? "h-full" : "aspect-square";

  return (
    <div
      className={twMerge(
        `cut-corners group relative flex`,
        props.className,
        fullHeight,
      )}
    >
      <div
        className={`z-1 absolute inset-0 overflow-hidden ${fallbackBackground}`}
      >
        {props.backgroundImage ? (
          <img
            alt=""
            className={`h-full w-full object-cover ${filters} scale-105 transition-transform duration-1000 ease-in-out group-hover:scale-110`}
            src={props.backgroundImage}
          />
        ) : null}
        {props.backgroundColor ? (
          <div
            className={`absolute inset-0 mix-blend-multiply ${props.backgroundColor} pointer-events-none`}
          ></div>
        ) : null}
      </div>
      <Link
        href={props.link || "/"}
        className={`z-2 relative p-5 ${
          props.dark ? "text-black" : "text-white"
        }  flex h-full w-full flex-col justify-between gap-3 no-underline`}
      >
        <div className="text-md text-center font-mono uppercase">
          {props.type}
        </div>
        <div className={`mx-auto text-center ${titleSize} font-medium`}>
          {props.title}
        </div>
        <div className="text-center">{props.subtitle || " "}</div>
      </Link>
    </div>
  );
}

export const PublicationBox = block(
  {
    label: "Publication box",
    props: boxProps,
    propSources: [boxPublicationSource as any],
    examples: [
      {
        label: "Example publication",
        context: {},
        display: { width: 400 },
        props: {
          backgroundColor: "bg-blue-500",
          backgroundImage:
            "https://dlc.services/thumbs/7/20/76ac865a-099b-43ca-9040-74872c687fff/full/full/0/default.jpg",
          link: "/",
          title: "Example publication name",
          type: "publication",
        },
      },
    ],
  },
  Box.bind(null),
);

export const CollectionBox = block(
  {
    label: "Collection box",
    props: boxProps,
    propSources: [boxCollectionSource as any],
    examples: [
      {
        label: "Example collection",
        context: {},
        display: { width: 400 },
        props: {
          backgroundColor: "bg-purple-400",
          backgroundImage:
            "https://dlc.services/thumbs/7/21/17da5645-e7b1-8870-1de4-ac34fa58420a/full/full/0/default.jpg",
          link: "/",
          title: "Example collection name",
          type: "collection",
        },
      },
    ],
  },
  Box.bind(null),
);

export const ManifestBox = block(
  {
    label: "Manifest box",
    props: boxProps,
    propSources: [boxManifestSource as any],
    examples: [
      {
        label: "Example manifest",
        context: {},
        display: { width: 400 },
        props: {
          backgroundColor: "bg-indigo-500",
          backgroundImage:
            "https://dlc.services/thumbs/7/21/17da5645-e7b1-8870-1de4-ac34fa58420a/full/full/0/default.jpg",
          link: "/",
          title: "Example manifest name",
          type: "object",
        },
      },
    ],
  },
  Box.bind(null),
);

export const ExhibitionBox = block(
  {
    label: "Exhibition box",
    props: boxProps,
    propSources: [boxExhibitionSource as any],
    examples: [
      {
        label: "Example exhibition",
        context: {},
        display: { width: 400 },
        props: {
          backgroundColor: "bg-indigo-500",
          backgroundImage:
            "https://dlc.services/thumbs/7/21/17da5645-e7b1-8870-1de4-ac34fa58420a/full/full/0/default.jpg",
          link: "/",
          title: "Example exhibition name",
          type: "exhibition",
        },
      },
    ],
  },
  Box.bind(null),
);
