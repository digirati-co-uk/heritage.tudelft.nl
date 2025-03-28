import type { SVGProps } from "react";

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <title>Pause</title>
      <path fill="currentColor" d="M14 19V5h4v14zm-8 0V5h4v14z" />
    </svg>
  );
}
