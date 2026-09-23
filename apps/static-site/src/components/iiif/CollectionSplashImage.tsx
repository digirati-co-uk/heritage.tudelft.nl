"use client";

import {
  SimpleViewerProvider,
  type SingleImageStrategy,
  useExternalManifest,
  useImage,
  useRenderingStrategy,
  useSimpleViewer,
  useVault,
} from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useMediaQuery } from "usehooks-ts";

export type CollectionSplashImageProps = {
  manifest: string;
  canvas?: string | number;
  className?: string;
  crop?: { x: number; y: number; w: number; h: number };
  cropMobile?: { x: number; y: number; w: number; h: number };
  children: React.ReactNode;
};

export function CollectionSplashImage({
  manifest: manifestId,
  canvas = 0,
  className,
  crop: cropDesktop,
  cropMobile,
  children,
}: CollectionSplashImageProps) {
  const vault = useVault();
  const matches = useMediaQuery("(min-width: 900px)");
  const { manifest, isLoaded } = useExternalManifest(manifestId, { noCache: true });
  const crop = matches ? cropDesktop : cropMobile;

  if (!isLoaded) {
    return <div className={twMerge(className, "bg-black")}>{children}</div>;
  }

  return (
    <SimpleViewerProvider vault={vault} manifest={manifestId}>
      <BackgroundWrapper className={className} crop={crop}>
        {/*<pre>{JSON.stringify(manifest, null, 2)}</pre>*/}
        {children}
      </BackgroundWrapper>
    </SimpleViewerProvider>
  );
}

function BackgroundWrapper(props: {
  children: React.ReactNode;
  className?: string;
  crop?: { x: number; y: number; w: number; h: number };
}) {
  const [strategy] = useRenderingStrategy();
  const image = useImage(
    (strategy as SingleImageStrategy).image.service,
    {
      region: props.crop,
    },
    [strategy],
  );
  const fallback = <div className={props.className}>{props.children}</div>;

  if (strategy.type !== "images" || !image) {
    return fallback;
  }

  return (
    <div
      className={twMerge("bg-origin-content bg-cover bg-center", props.className)}
      style={{ backgroundImage: `url(${image})` }}
    >
      {props.children}
    </div>
  );
}
