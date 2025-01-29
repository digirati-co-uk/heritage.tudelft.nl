"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { useState } from "react";
import { TextualContentStrategy } from "react-iiif-vault";
import { BurgerIcon } from "../atoms/BurgerIcon";
import { CloseIcon } from "../atoms/CloseIcon";

export function TOCBar({
  manifest,
  heading,
  barContent,
  tocOpen,
  setTocOpen,
}: {
  manifest: Manifest;
  strategy?: TextualContentStrategy;
  heading: string;
  barContent: string;
  tocOpen: boolean;
  setTocOpen: (isOpen: boolean) => void;
}) {
  const title = getValue(manifest.label);
  //const [tocOpen, setTocOpen] = useState(false);
  const contents = manifest.items;

  return (
    <>
      {tocOpen && (
        <div className="fixed top-0 flex h-full w-full flex-row items-center justify-center">
          {/* MODAL CONTAINER */}
          <div className="border-1 cut-corners mx-auto w-3/5 border-[#6d6e70] bg-[#6d6e70] px-8 py-5 text-white">
            <div className="mb-3 flex flex-row justify-between">
              <div className="text-lg">{`${title} - ${heading}`}</div>
              <button onClick={() => setTocOpen(false)}>
                <CloseIcon fill={"#fff"} />
              </button>
            </div>
            <ul>
              {contents.map((item, idx) => {
                const label = getValue(item.label);
                return (
                  <li>
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
      <div className="fixed bottom-10 right-0 flex min-h-14 w-full flex-row items-center justify-between bg-[#6d6e70] px-5 text-4xl font-medium text-white">
        <div className="flex flex-row gap-6">
          <div>{title}</div>
          <div className="font-light">{barContent}</div>
        </div>

        <button
          onClick={() => {
            setTocOpen(!tocOpen);
          }}
        >
          <BurgerIcon />
        </button>
      </div>
    </>
  );
}
