"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { ExpandDownIcon } from "../atoms/ExpandDownIcon";
import { CloseIcon } from "../atoms/CloseIcon";
import { twMerge } from "tailwind-merge";
import { CollapseUpIcon } from "../atoms/CollapseUpIcon";

export function TOCBar({
  manifest,
  heading,
  barContent,
  tocOpen,
  setTocOpen,
  tocBarShown,
}: {
  manifest: Manifest;
  heading: string;
  barContent: string;
  tocOpen: boolean;
  setTocOpen: (isOpen: boolean) => void;
  tocBarShown: boolean;
}) {
  const title = getValue(manifest.label);
  const contents = manifest.items;
  const barDisplayClass = tocBarShown ? "opacity-100" : "opacity-0";

  return (
    <>
      {tocOpen && (
        <div className="fixed left-0 top-0 flex h-full w-full flex-row justify-center border border-red-600">
          {/* MODAL CONTAINER */}
          <div className="col-span-12 w-full max-w-screen-xl px-5 pt-10 text-white lg:px-10">
            <div className="bg-[#6d6e70] p-5">
              <div className="mb-3 flex flex-row justify-between">
                <div className="text-lg">{`${title} - ${heading}`}</div>
                {/* <button onClick={() => setTocOpen(false)}>
                  <CloseIcon fill={"#fff"} />
                </button> */}
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
        </div>
      )}
      {/* BAR */}

      <div
        className={twMerge(
          "fixed left-0 top-0 flex min-h-14 w-full flex-row content-center justify-center bg-[#6d6e70] px-5 transition-opacity duration-300 ease-in-out lg:px-0",
          barDisplayClass
        )}
      >
        <div className="col-span-12 w-full max-w-screen-xl lg:px-10">
          <div className="mx-auto flex flex-row items-center justify-between gap-2 text-2xl font-medium text-white lg:text-4xl">
            <div className="m-2 flex flex-col gap-1 md:flex-row md:gap-6">
              <div>
                <a href="#0" aria-label="Back to top">
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
            >
              {tocOpen ? <CollapseUpIcon /> : <ExpandDownIcon />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
