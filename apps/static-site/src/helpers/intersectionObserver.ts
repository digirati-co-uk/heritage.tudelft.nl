import { useEffect, useRef, useState } from "react";

export const useIntersection = (element: typeof useRef, rootMargin: string) => {
  const [isVisible, setState] = useState(false);

  useEffect(() => {
    const current = element?.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        entry && setState(entry.isIntersecting);
      },
      { rootMargin }
    );
    current && observer?.observe(current);
    return () => current && observer.unobserve(current);
  }, []);

  return isVisible;
};
