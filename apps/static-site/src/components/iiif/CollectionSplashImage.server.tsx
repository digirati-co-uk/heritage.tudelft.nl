import { Suspense } from "react";
import { CollectionSplashImage, type CollectionSplashImageProps } from "./CollectionSplashImage";

export function ServerCollectionSplashImage({ children, className, ...props }: CollectionSplashImageProps) {
  return (
    <Suspense fallback={<div className={`bg-black ${className}`}>{children}</div>}>
      <CollectionSplashImage className={className} {...props}>
        {children}
      </CollectionSplashImage>
    </Suspense>
  );
}
