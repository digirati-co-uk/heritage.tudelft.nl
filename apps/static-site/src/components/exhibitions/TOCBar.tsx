"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { useState } from "react";
import { TextualContentStrategy } from "react-iiif-vault";
import { getTranslations } from "next-intl/server";

export function TOCBar({
  manifest,
  strategy,
  TOCHeading,
}: {
  manifest: Manifest;
  strategy?: TextualContentStrategy;
  TOCHeading: string;
}) {
  const title = getValue(manifest.label);
  const [tocOpen, setTocOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<string>();

  //const contents = manifest.items.filter((item) => item.summary);
  const contents = manifest.items;

  return (
    <>
      {tocOpen && (
        <div className="fixed top-0 flex h-full w-full flex-row items-center justify-center">
          {/* MODAL CONTAINER */}
          <div className="border-1 cut-corners mx-auto w-3/5 border-[#6d6e70] bg-[#6d6e70] px-8 py-5 text-white">
            <div className="mb-3 flex flex-row justify-between">
              <div className="text-lg">{`${title} - ${TOCHeading}`}</div>
              <button onClick={() => setTocOpen(false)}>X</button>
            </div>
            <ul>
              {contents.map((item, idx) => {
                const label = getValue(item.label);
                return (
                  <li>
                    <a className="hover:underline" onClick={() => setCurrentItem(label)} href={`#${idx}`}>
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <div className="fixed bottom-10 right-0 flex min-h-14 w-full flex-row items-center justify-between bg-[#6d6e70] px-5 text-4xl font-medium text-white">
        <div className="flex flex-row gap-6">
          <div>{title}</div>
          <div className="font-light">{currentItem}</div>
        </div>

        <button
          onClick={() => {
            setTocOpen(!tocOpen);
          }}
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M32 96v64h448V96H32zm0 128v64h448v-64H32zm0 128v64h448v-64H32z"></path>
          </svg>
        </button>
      </div>
    </>
  );
}
