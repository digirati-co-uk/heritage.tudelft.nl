import { useLayoutEffect } from "react";

export function useIntersectionRef(
  ref: React.RefObject<HTMLElement>,
  handleIntersect: (entries: IntersectionObserverEntry[]) => void,
  intersectionOptions?: IntersectionObserverInit,
  deps: any[] = [],
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Custom deps.
  useLayoutEffect(() => {
    const current = ref?.current;
    if (current) {
      const observer = new IntersectionObserver(handleIntersect, {
        rootMargin: "10% 0px 10% 0px",
        threshold: 1.0,
      });

      observer.observe(current);
      return () => {
        observer.unobserve(current);
        observer.disconnect();
      };
    }
    return () => {
      // void.
    };
  }, [ref, intersectionOptions, ...deps]);
}
