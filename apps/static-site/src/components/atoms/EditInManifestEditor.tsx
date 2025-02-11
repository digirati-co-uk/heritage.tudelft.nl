import { EditIcon } from "./EditIcon";

const ME_URL =
  process.env.NEXT_PUBLIC_ME_URL || "https://manifest-editor.digirati.services";

export function EditInManifestEditor({
  id,
  preset,
}: { id: string; preset?: string }) {
  const DEV_LINK =
    process.env.NODE_ENV !== "production" ? (
      <div className="fixed bg-white z-40 bottom-2 rounded right-2 text-md py-2 px-4 flex gap-4">
        <a
          href={`${ME_URL}/editor/external?manifest=${id}&preset=${preset}`}
          target="_blank"
          className="underline hover:text-slate-500 flex gap-2 items-center"
          rel="noreferrer"
        >
          <EditIcon className="text-2xl" />
          Edit in Manifest Editor
        </a>
      </div>
    ) : null;

  return DEV_LINK;
}
