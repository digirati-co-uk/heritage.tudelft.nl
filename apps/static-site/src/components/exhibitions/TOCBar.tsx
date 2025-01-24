"use client";
import { Manifest } from "@iiif/presentation-3";
import { getValue } from "@iiif/helpers";
import { useState, useEffect } from "react";
import { TOCModal } from "./TOCModal";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/navigation";

export function TOCBar({ manifest, toc }: { manifest: Manifest; toc: string }) {
  const title = getValue(manifest.label);
  const [tocOpen, setTocOpen] = useState(false);

  console.log(toc);

  // useEffect(() => {
  //   console.log("Hash:", window.location.hash);
  // }, [params]);

  const contents = manifest.items;

  function goto(item: string) {}

  return (
    <>
      {tocOpen && (
        <div className="fixed top-0 flex h-full w-full flex-row items-center">
          <div className="mx-auto w-4/5 border-2 border-red-700 bg-slate-500 p-10 text-2xl">
            <div>TABLE OF CONTENTS</div>
            <ul>
              {manifest.items.map((item) => {
                const label = getValue(item.label);
                return (
                  <li>
                    {/* <button onClick={() => goto(item)}>{item}</button> */}
                    <a href={`#${label}`}>{label}</a>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => setTocOpen(false)}>X</button>
          </div>
        </div>
      )}
      <div className="fixed bottom-10 right-0 flex min-h-14 w-full flex-row items-center justify-between bg-[#6d6e70] px-5 text-4xl font-medium text-white">
        <div className="flex flex-row gap-6">
          <div>{title}</div>
          <div className="font-light">{toc}</div>
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
