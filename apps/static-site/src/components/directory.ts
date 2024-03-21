import { createDirectory } from "@page-blocks/react";
import { CollectionBox, ManifestBox, PublicationBox, ExhibitionBox } from "@/components/blocks/Box";
import { HeadingParagraph } from "@/components/blocks/HeadingParagraph";
import { CardGrid } from "@/components/blocks/CardGrid";
import * as FramePanel from "./blocks/FramePanel";

export const directory = createDirectory({
  context: {},
  resolver: {
    type: "tanstack-query",
    endpoint: "/api/page-blocks",
    screenshots: "/blocks",
  },
  blocks: {
    PublicationBox,
    CollectionBox,
    ManifestBox,
    HeadingParagraph,
    ExhibitionBox,
    CardGrid,
    FramePanel: FramePanel.default,
  },
});

export const Blocks = directory.Blocks;
export const Slot = directory.Slot;

// export const SlotContext = directory.SlotContext;
