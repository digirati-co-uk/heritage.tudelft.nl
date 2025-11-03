import { DevEditManifest } from "../atoms/DevEditManifest";
import { Illustration } from "./Illustration";

export function IllustrationServer(props: { source?: string; manifest?: string; canvas?: string }) {
  const uuid = props.source?.split(".json")[0];
  const slug = uuid ? `manifests/${uuid}` : null;

  return (
    <>
      <Illustration {...props} />
      {slug && <DevEditManifest slug={slug} />}
    </>
  );
}
