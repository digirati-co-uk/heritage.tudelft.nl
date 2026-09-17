"use client";

import { useTranslations } from "next-intl";
import { Children, type ReactNode, useEffect, useId, useRef, useState } from "react";

export function FeaturedCollectionCarousel({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const id = useId();
  const ref = useRef<HTMLUListElement>(null);
  const count = Children.count(children);
  const [pages, setPages] = useState<number[]>([0]);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const list = ref.current;
    if (!list || !count) return;
    let offsets = [0];

    const updateActivePage = () => {
      setActivePage(
        offsets.reduce(
          (closest, offset, index) =>
            Math.abs(list.scrollLeft - offset) < Math.abs(list.scrollLeft - (offsets[closest] ?? 0)) ? index : closest,
          0,
        ),
      );
    };
    const measure = () => {
      const cardWidth = list.firstElementChild?.getBoundingClientRect().width;
      if (!cardWidth) return;
      const perPage = Math.max(1, Math.floor(list.clientWidth / cardWidth + 0.01));
      const maxScroll = list.scrollWidth - list.clientWidth;
      offsets = Array.from({ length: Math.ceil(count / perPage) }, (_, page) =>
        Math.min(page * perPage * cardWidth, maxScroll),
      );
      setPages(offsets);
      updateActivePage();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.addEventListener("scroll", updateActivePage, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", updateActivePage);
    };
  }, [count]);

  return (
    <>
      <ul
        id={id}
        ref={ref}
        aria-label={t("Featured collections")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The native scroll container needs keyboard access.
        tabIndex={0}
        className="grid auto-cols-[85%] grid-flow-col snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:auto-cols-[50%] lg:auto-cols-[calc(100%/3)] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {pages.length > 1 ? (
        <div className="mt-4 hidden flex-wrap justify-center sm:flex">
          {pages.map((offset, page) => (
            <button
              key={page}
              type="button"
              aria-label={t("Collection page", { page: page + 1, total: pages.length })}
              aria-controls={id}
              aria-current={page === activePage ? "true" : undefined}
              onClick={() => ref.current?.scrollTo({ left: offset })}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              <span
                aria-hidden="true"
                className={`size-4 rounded-full ${page === activePage ? "bg-zinc-900" : "bg-white"}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
