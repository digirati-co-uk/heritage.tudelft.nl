import { twMerge } from "tailwind-merge";

export interface BaseSlideProps {
  className?: string;
  index: number;
  active: boolean;
}

export function BaseSlide(
  props: BaseSlideProps & {
    children: React.ReactNode;
  },
) {
  return (
    <section
      className={twMerge(
        "delft-slide mb-8 override-scrollbars transition-opacity overflow-y-auto",
        props.active ? "z-10 opacity-100" : "opacity-0",
        props.className,
      )}
    >
      {props.children}
    </section>
  );
}
