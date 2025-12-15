import { Dialog } from "@headlessui/react";
import { usePress } from "react-aria";

export async function TableOfContentsModal({ tocOpen, onClose }: { tocOpen: boolean; onClose: () => void }) {
  const closeButtons = usePress({
    onPress: onClose,
  });

  return (
    <Dialog className="exhibition-viewer exhibition-viewer-dialog" open={tocOpen} onClose={onClose}>
      <div className="fixed modal-top flex h-full w-full flex-row items-center">
        <div className="mx-auto w-4/5 border-2 border-red-700 bg-slate-500 p-10 text-2xl">
          <h2>TABLE OF CONTENTS</h2>
          <button {...closeButtons.pressProps}>X</button>
        </div>
      </div>
    </Dialog>
  );
}
