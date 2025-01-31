"use client";
import invariant from "tiny-invariant";
import { AutoLanguage } from "../pages/AutoLanguage";
import { UpIcon } from "../atoms/UpIcon";
import { DownIcon } from "../atoms/DownIcon";
import { useRef, useState, useLayoutEffect } from "react";
import { getValue } from "@iiif/helpers";
import type { Manifest } from "@iiif/presentation-3";

export function TitlePanel({
  manifest,
  position,
  showTitle,
  updateTocBar,
}: {
  manifest: Manifest;
  position: number;
  showTitle: boolean;
  updateTocBar: (heading: string, position: number, showTocBar: boolean) => void;
}) {
  const ref = useRef(null);

  //https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#rootmargin
  // amount to reduce the intersection root container by. It starts as window height.
  // viewport height - (height-200) = leaves a 200 high region at the top.
  const { height } = useWindowDimensions();
  const bottomMargin = -(height - 200);
  const intersectionOptions = {
    rootMargin: `0px 0px ${bottomMargin}px 0px`,
    threshold: 1.0,
  };

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  }

  function useWindowDimensions() {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
    useLayoutEffect(() => {
      function handleResize() {
        setWindowDimensions(getWindowDimensions());
      }
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowDimensions;
  }

  function handleIntersect(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      const targetId: string = entry.target.id;
      const id = Number.parseInt(targetId);
      const heading = !Number.isNaN(id) && getValue(manifest.items[id]?.label);
      if (entry.isIntersecting) {
        heading && updateTocBar(heading, id, targetId !== "0"); // update heading and show bar for all except zeroth position
      }
    }
  }
  useLayoutEffect(() => {
    const current = ref?.current;
    const observer = new IntersectionObserver(handleIntersect, intersectionOptions);
    current && observer.observe(current);
    return () => current && observer.unobserve(current);
  }, [height]);
  invariant(manifest, "Manifest not found");
  return (
    manifest.items[position]?.label &&
    (showTitle ? (
      position === 0 ? (
        <div className="col-span-12 w-full px-5 pb-8 text-black" id={`${position.toString()}`} ref={ref}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-row justify-between">
              {/* TODO: PASS IN TRANSLATED WORDS!! */}
              <div className="text-xl uppercase">Exhibition</div>
            </div>
            <div className="flex flex-row justify-between">
              <h1 className="text-4xl font-medium">
                <AutoLanguage>{manifest.label}</AutoLanguage>
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="col-span-12 w-full px-5 pb-8 pt-8 text-black" id={`${position.toString()}`} ref={ref}>
          <div className="flex flex-row justify-between">
            <h2 className="text-4xl font-light">
              <AutoLanguage>{manifest.items[position]?.label}</AutoLanguage>
            </h2>
          </div>
        </div>
      )
    ) : (
      <div id={`${position.toString()}`} ref={ref}></div>
    ))
  );
}
