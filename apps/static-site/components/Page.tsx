import { ReactNode } from "react";

export function Page(props: { children: ReactNode }) {
  return <div className="max-w-screen-xl w-full px-10">{props.children}</div>;
}
