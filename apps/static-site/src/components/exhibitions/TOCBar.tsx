"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { ExpandDownIcon } from "../atoms/ExpandDownIcon";
import { CollapseUpIcon } from "../atoms/CollapseUpIcon";

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
          <div className="flex flex-row items-center justify-between gap-2 text-2xl font-medium text-white lg:mb-1.5 lg:text-4xl">
            <div className="m-2 font-light">{barContent}</div>
            <button
              aria-label={`${tocOpen ? "Hide" : "Show"} table of contents`}
              onClick={() => {
                setTocOpen(!tocOpen);
              }}
              className="mb-2 self-end lg:mb-1"
            >
              {tocOpen ? <ExpandDownIcon /> : <CollapseUpIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* TOC MODAL */}
      {tocOpen && (
        <div className="fixed bottom-[3.5rem] left-0 z-40 flex w-full flex-row content-center justify-center border-b-2 border-black bg-[#6d6e70] px-4 lg:px-10">
          <div className="z-40 flex w-full max-w-screen-xl flex-col px-2 py-5 text-white">
            <div className="mb-3">
              <div className="text-lg">{`${title} - ${heading}`}</div>
            </div>
            <ul>
              {contents.map((item, idx) => {
                const label = getValue(item.label);
                return (
                  <li key={`toc_entry_${idx}_${label.substring(0, 20)}`}>
                    <a className="hover:underline" href={`#${idx}`}>
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
