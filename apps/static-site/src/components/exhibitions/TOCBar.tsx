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
      {/* BAR - with pseudo element to make it appear full width outside of narrow page container*/}
      <div
        className="sticky left-0 top-0 z-30 flex min-h-14 w-full flex-row content-center justify-center
           before:absolute 
           before:bottom-0 
           before:left-[-100%]
           before:right-[-100%]
           before:top-0 
           before:z-10 
           before:w-[300vw] 
           before:bg-[#6d6e70]
           before:content-['']"
      >
        <div className="relative z-30 w-full max-w-screen-xl">
          <div className="flex flex-row items-center justify-between gap-2 text-2xl font-medium text-white lg:mb-1.5 lg:text-4xl">
            <div className="m-2 flex flex-col gap-1 md:flex-row md:gap-6">
              <div>
                <a href="#site_top" aria-label="Back to top">
                  {title}
                </a>
              </div>
              <div className="font-light">{barContent}</div>
            </div>

            <button
              aria-label={`${tocOpen ? "Hide" : "Show"} table of contents`}
              onClick={() => {
                setTocOpen(!tocOpen);
              }}
              className="mb-2 self-end lg:mb-1"
            >
              {tocOpen ? <CollapseUpIcon /> : <ExpandDownIcon />}
            </button>
          </div>
        </div>
      </div>
      {/* TOC MODAL */}
      {tocOpen && (
        <div className="absolute left-0 z-40 flex w-full flex-row content-center justify-center bg-[#6d6e70]">
          <div className="z-40 flex w-full max-w-screen-xl flex-col px-7 py-5 text-white lg:px-12">
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
