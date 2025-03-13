import { loadManifest } from "@/iiif";
import { EditIcon } from "./EditIcon";

const ME_URL =
  process.env.NEXT_PUBLIC_ME_URL || "https://manifest-editor.digirati.services";

export async function DevEditManifest({
  slug,
  preset = "manifest",
}: { slug: string; preset?: string }) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const { manifest } = await loadManifest(slug);

  return (
    <div>
      <a
        href={`${ME_URL}/editor/external?manifest=${manifest.id}&preset=${preset}`}
        target="_blank"
        className="underline hover:text-slate-500 flex gap-2 items-center"
        rel="noreferrer"
      >
        <EditIcon className="text-2xl" />
        Edit in Manifest Editor
      </a>
    </div>
  );
}
