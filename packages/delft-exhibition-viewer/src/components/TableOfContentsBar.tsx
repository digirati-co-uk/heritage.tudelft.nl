import { Dialog } from "@headlessui/react";
import { createRangeHelper, getValue } from "@iiif/helpers";
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
import { ContentsIcon } from "./icons/ContentsIcon";
import { IIIFIcon } from "./icons/IIIFIcon";
import { PlayIcon } from "./icons/PlayIcon";
import { TopIcon } from "./icons/TopIcon";

export function TableOfContentsBar({
  initialOpen = false,
  hideInitial = false,
  content,
  onPlay,
}: {
  hideInitial?: boolean;
  initialOpen?: boolean;
  content: { tableOfContents: string };
  onPlay?: () => void;
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
    <>
      {/* BAR */}
      <div
        className={twMerge(
          "fixed bottom-0 left-0 right-0 z-30 min-h-14 items-center content-center place-items-center justify-center bg-[#6d6e70] px-4 lg:px-9",
          "transition-opacity drop-shadow-lg",
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
                {currentItem ? (
                  <LocaleString>{currentItem?.label}</LocaleString>
                ) : (
                  content.tableOfContents
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
              <a
                href="#top"
                aria-label={"Back to top"}
                className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
              >
                <TopIcon />
              </a>
              {onPlay ? (
                <button
                  className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                  onClick={onPlay}
                  aria-label="Play"
                >
                  <span className="sr-only">Play</span>
                  <PlayIcon />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* TOC MODAL */}

      <Dialog
        className={twMerge(
          "fixed bottom-[3.5rem] left-0 right-0 z-40 flex max-h-[90vh] flex-row content-center justify-center bg-[#6d6e70] px-4",
          "transition-all duration-300 ease-in-out transform origin-bottom",
          isTocOpen ? "opacity-1 scale-100" : "opacity-0 scale-95",
        )}
        open={isTocOpen}
        onClose={() => setTocOpen(false)}
      >
        <Dialog.Panel className="z-40 flex w-full max-w-screen-xl flex-col px-10 py-6 text-white border-b overflow-y-auto border-[#5A5B5D]">
          <div className="mb-3 flex flex-col gap-4">
            <div className="flex">
              <LocaleString className="text-2xl uppercase mb-4 flex-1">
                {manifest?.label}
              </LocaleString>

              <a
                href={`${manifest?.id}?manifest=${manifest?.id}`}
                target="_blank"
                className=""
                title="Drag and Drop IIIF Resource"
                rel="noreferrer"
              >
                <IIIFIcon
                  className="text-xl text-white/50 hover:text-white"
                  title={"Open IIIF Manifest"}
                />
                <span className="sr-only">Open IIIF Manifest</span>
              </a>
            </div>
            {tree ? (
              <LocaleString className="text-lg">{tree.label}</LocaleString>
            ) : null}
          </div>
          <ol className="list-decimal flex flex-col gap-2 font-mono">
            {items.map((item, idx) => {
              if (!item.label) return null;
              return (
                <li key={`toc_entry_${idx}`} className="marker:text-white/40">
                  <LocaleString
                    as="a"
                    className={twMerge(
                      "text-md hover:underline",
                      hashAsNumber === idx ? "underline" : "",
                    )}
                    href={`#${idx}`}
                  >
                    {item.label}
                  </LocaleString>
                </li>
              );
            })}
          </ol>
        </Dialog.Panel>
      </Dialog>
    </>
  );
}
