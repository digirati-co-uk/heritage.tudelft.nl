"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { CloseIcon } from "./CloseIcon";

export function MobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="lg:hidden">
        <button
          ref={button}
          onClick={() => {
            setIsOpen(true);
            // menu.current?.showModal();
          }}
          className="flex h-10 w-10 items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {open ? <div className="fixed inset-0 z-50 bg-slate-400 opacity-50" onClick={() => setIsOpen(false)} /> : null}
      <dialog
        open={open}
        ref={menu}
        className={`fixed inset-0 z-50 w-full bg-[#1D1F71] py-8 shadow-lg backdrop:opacity-50 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="flex justify-end px-8">
          <button
            onClick={() => {
              setIsOpen(false);
              // menu.current?.close();
            }}
            className=""
          >
            <CloseIcon fill="#fff" />
          </button>
        </div>
        <ul className="flex flex-col items-center gap-5 text-xl text-white">{children}</ul>
      </dialog>
    </>
  );
}
