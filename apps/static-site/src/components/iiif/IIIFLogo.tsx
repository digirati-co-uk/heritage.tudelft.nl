import { ComponentProps, useId } from "react";

export function IIIFLogo({
  title,
  withColor,
  ...props
}: ComponentProps<"svg"> & { title: string; withColor?: boolean }) {
  const titleId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="b"
      viewBox="0 0 90.63 81.07"
      width="1em"
      height="1em"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <g id="c">
        <path
          d="m1.6 27.71 17.39 6.46-.03 46.53L1.6 74.3V27.71zM19.7 16.41c1.99 5.9-.65 10.68-5.9 10.68S2.66 22.31.67 16.41c-1.99-5.9.65-10.68 5.9-10.68S17.7 10.51 19.7 16.41ZM41.11 27.71l-17.39 6.46.03 46.53 17.36-6.4V27.71zM22.9 16.41c-1.99 5.9.65 10.68 5.9 10.68s11.13-4.78 13.13-10.68c1.99-5.9-.65-10.68-5.9-10.68S24.9 10.51 22.9 16.41ZM45.56 27.71l17.39 6.46-.03 46.53-17.36-6.4V27.71zM63.77 16.41c1.99 5.9-.65 10.68-5.9 10.68s-11.13-4.78-13.13-10.68c-1.99-5.9.65-10.68 5.9-10.68s11.13 4.78 13.13 10.68ZM90.63 0v15.98s-5.63-2.2-6.31 3.49c-.06 6.06 0 8.24 0 8.24l6.31-2.05v14.02l-6.33 2.27v32.7L67 81.08V23.27S66.63 2.45 90.64 0Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
