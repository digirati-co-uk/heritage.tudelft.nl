import { getViewObjectLinks } from "@/helpers/get-view-object-links";
import { loadMeta } from "@/iiif";
import { DevEditManifest } from "../atoms/DevEditManifest";
import { Illustration } from "./Illustration";

export async function IllustrationServer(props: { source?: string; manifest?: string; canvas?: string }) {
  const uuid = props.source?.split(".json")[0];
  const slug = uuid ? `manifests/${uuid}` : null;
  const viewObjectLinks = await getViewObjectLinks(slug);

  return (
    <>
      <Illustration {...props} viewObjectLinks={viewObjectLinks} />
      {slug && <DevEditManifest slug={slug} />}
    </>
  );
}
