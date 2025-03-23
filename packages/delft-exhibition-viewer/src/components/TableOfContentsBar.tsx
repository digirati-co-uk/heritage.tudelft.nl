import { Dialog } from "@headlessui/react";
import { createRangeHelper, getValue } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import { useMemo, useState } from "react";
import { usePress } from "react-aria";
import {
  LocaleString,
  useManifest,
  useVault,
  useVaultSelector,
} from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "../helpers/use-hash-value";
import { TableOfContents } from "./TableOfContents";
import { ContentsIcon } from "./icons/ContentsIcon";
import { IIIFIcon } from "./icons/IIIFIcon";
import { PlayIcon } from "./icons/PlayIcon";
import { TopIcon } from "./icons/TopIcon";

export function TableOfContentsBar({
  initialOpen = false,
  hideInitial = false,
  fixed = false,
  content,
  onPlay,
  children,
}: {
  hideInitial?: boolean;
  initialOpen?: boolean;
  fixed?: boolean;
  content: { tableOfContents: string | InternationalString };
  onPlay?: () => void;
  children?: React.ReactNode;
}) {
  const [hash] = useHashValue(() => {
    // custom on change.
    setTocOpen(false);
  });
  const manifest = useManifest();
  const vault = useVault();
  const rangeHelper = useMemo(() => createRangeHelper(vault), [vault]);
  const range = useVaultSelector((s, vault) =>
    vault.get((manifest?.structures || [])[0]),
  );
  const canvases = useVaultSelector((s, vault) =>
    vault.get(manifest?.items || []),
  );
  const tree = useMemo(
    () => rangeHelper.rangeToTableOfContentsTree(range),
    [range, rangeHelper],
  );

  const items = tree?.items || canvases || [];

  const hashAsNumber = hash ? Number.parseInt(hash, 10) : null;
  const currentItem = hashAsNumber ? items[hashAsNumber] : null;

  const [isTocOpen, setTocOpen] = useState(initialOpen);

  const toggleProps = usePress({
    onPress: () => {
      setTocOpen((o) => !o);
    },
  });

  return (
    <div className="relative">
      {!fixed && isTocOpen ? (
        <div className="absolute bottom-0 z-30 mb-14 px-14 py-4 text-white overflow-y-auto bg-[#6d6e70] left-0 right-0">
          <TableOfContents items={items} treeLabel={tree?.label} />
        </div>
      ) : null}

      <div
        className={twMerge(
          "z-30 h-14 flex items-center flex-col bg-[#6d6e70]",
          "transition-opacity drop-shadow-lg px-4",

          fixed && "fixed bottom-0 left-0 right-0 px-4 lg:px-9",

          currentItem || !hideInitial
            ? "pointer-events-auto opacity-1"
            : "pointer-events-none opacity-0",
        )}
      >
        <div className="relative z-30 w-full max-w-screen-xl px-5 lg:px-10">
          <div className="flex flex-row items-center justify-between gap-2 text-lg font-medium text-white sm:text-2xl font-mono">
            <div className="my-2 font-light flex-1 min-w-0">
              <button
                className="z-50 uppercase text-white overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full"
                aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
                {...toggleProps.pressProps}
              >
                {currentItem?.label ? (
                  <LocaleString>{currentItem?.label}</LocaleString>
                ) : (
                  <LocaleString>{content.tableOfContents}</LocaleString>
                )}
              </button>
            </div>
            <div className="flex flex-row items-center gap-2 text-3xl flex-shrink-0">
              <button
                className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                {...toggleProps.pressProps}
                aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
              >
                <ContentsIcon />
              </button>

              {/* Additional controls. */}
              {children}
            </div>
          </div>
        </div>
      </div>

      {fixed ? (
        <Dialog
          className={twMerge(
            "z-40 flex max-h-[90vh] flex-row content-center justify-center bg-[#6d6e70] px-4",
            fixed
              ? "fixed bottom-[3.5rem] left-0 right-0 "
              : "absolute bottom-0",
            "transition-all duration-300 ease-in-out transform origin-bottom",
            isTocOpen ? "opacity-1 scale-100" : "opacity-0 scale-95",
          )}
          open={isTocOpen}
          onClose={() => setTocOpen(false)}
        >
          <Dialog.Panel className="z-40 flex w-full max-w-screen-xl flex-col px-10 py-6 text-white border-b overflow-y-auto border-[#5A5B5D]">
            <TableOfContents treeLabel={tree?.label} items={items} />
          </Dialog.Panel>
        </Dialog>
      ) : null}
    </div>
  );
}
