import { block } from "@page-blocks/react";
import { z } from "zod";
import { Link } from "@/navigation";
import {
  boxCollectionSource,
  boxExhibitionSource,
  boxManifestSource,
  boxPublicationSource,
} from "@/blocks/sources/box-source";

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
      "bg-indigo-500",
      "bg-purple-400",
    ])
    .optional(),
  backgroundImage: z.string().optional(),
  dark: z.boolean().optional(),
  unfiltered: z.boolean().optional(),
});

export function Box(props: z.infer<typeof boxProps>) {
  const filters = props.unfiltered ? "" : "grayscale";
  return (
    <div className="aspect-square cut-corners relative flex group">
      <div className="bg-yellow-400 absolute inset-0 z-1 overflow-hidden">
        {props.backgroundImage ? (
          <img
            alt=""
            className={`object-cover w-full h-full ${filters} group-hover:scale-110 scale-105 transition-transform duration-1000 ease-in-out`}
            src={props.backgroundImage}
          />
        ) : null}
        {props.backgroundColor ? (
          <div
            className={`mix-blend-multiply absolute inset-0 ${props.backgroundColor} pointer-events-none`}
          ></div>
        ) : null}
      </div>
      <Link
        href={props.link || "/"}
        className={`relative z-2 p-5 ${
          props.dark ? "text-black" : "text-white"
        }  flex gap-3 flex-col h-full justify-between w-full no-underline`}
      >
        <div className="font-mono uppercase text-md text-center">
          {props.type}
        </div>
        <div className="mx-auto text-4xl  font-bold text-center">
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
