"use client";
import { Dialog } from "@headlessui/react";
export async function TOCModal({ tocOpen, onClose }: { tocOpen: boolean; onClose: () => void }) {
  return (
    <Dialog className="relative z-50" open={tocOpen} onClose={onClose}>
      <div className="fixed top-0 flex h-full w-full flex-row items-center">
        <div className="mx-auto w-4/5 border-2 border-red-700 bg-slate-500 p-10 text-2xl">
          <div>TABLE OF CONTENTS</div>
          <button onClick={onClose}>X</button>
        </div>
      </div>
    </Dialog>
  );
}
