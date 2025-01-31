"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { TopIcon } from "../atoms/TopIcon";
import { ContentsIcon } from "../atoms/ContentsIcon";

export function TOCBar({
  manifest,
  heading,
  barContent,
  tocOpen,
  setTocOpen,
}: {
  manifest: Manifest;
  heading: string;
  barContent: string;
  tocOpen: boolean;
  setTocOpen: (isOpen: boolean) => void;
}) {
  const title = getValue(manifest.label);
  const contents = manifest.items;

  return (
    <>
      {/* BAR */}
      <div className="fixed bottom-0 left-0 z-30 flex min-h-14 w-full flex-row content-center justify-center bg-[#6d6e70] px-4 lg:px-9">
        <div className="relative z-30 w-full max-w-screen-xl">
          <div className="flex flex-row items-center justify-between gap-2 text-lg font-medium text-white sm:text-2xl lg:mb-1.5">
            <div className="m-2 font-light">
              <button
                className="z-50 uppercase text-white"
                onClick={() => {
                  setTocOpen(!tocOpen);
                }}
                aria-label={`${tocOpen ? "Hide" : "Show"} table of contents`}
              >
                {barContent}
              </button>
            </div>
            <div className="flex flex-row items-center gap-1 text-3xl">
              <button
                className="z-50"
                onClick={() => {
                  setTocOpen(!tocOpen);
                }}
                aria-label={`${tocOpen ? "Hide" : "Show"} table of contents`}
              >
                <ContentsIcon />
              </button>
              <a href="#site_top" aria-label={"Back to top"} className="z-50">
                <TopIcon />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TOC MODAL */}
      {tocOpen && (
        <div className="fixed bottom-[3.5rem] left-0 z-40 flex max-h-[90vh] w-full flex-row content-center justify-center overflow-y-auto border-b-2 border-black bg-[#6d6e70] px-4 lg:px-10">
          <div className="z-40 flex w-full max-w-screen-xl flex-col px-2 py-5 text-white">
            <div className="mb-3 flex flex-col gap-4">
              <div className="text-lg uppercase">{title}</div>
              <div className="text-lg">{heading}</div>
            </div>
            <ul>
              {contents.map((item, idx) => {
                const label = getValue(item.label);
                return (
                  label && (
                    <li key={`toc_entry_${idx}_${label.substring(0, 20)}`}>
                      <a className="text-md hover:underline" href={`#${idx}`} onClick={() => setTocOpen(false)}>
                        {`${idx + 1}. ${label}`}
                      </a>
                    </li>
                  )
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
