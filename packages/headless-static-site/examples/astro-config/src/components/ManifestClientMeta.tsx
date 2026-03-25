import { useEffect, useState } from "react";
import { createIiifAstroClient } from "iiif-hss/astro/client";

type Props = {
  slug: string;
};

const iiif = createIiifAstroClient();

export function ManifestClientMeta({ slug }: Props) {
  const [status, setStatus] = useState("loading");
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    iiif
      .loadManifest(slug)
      .then((data) => {
        if (!active) {
          return;
        }
        const resourceLabel = data.resource?.label?.en?.[0] || data.meta?.label || slug;
        setLabel(resourceLabel);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return <p className="small">Client check: loading manifest...</p>;
  }

  if (status === "error") {
    return <p className="small">Client check: failed to load manifest</p>;
  }

  return <p className="small">Client check: {label}</p>;
}
