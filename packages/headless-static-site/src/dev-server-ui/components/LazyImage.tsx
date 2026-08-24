import { LazyLoadComponent } from "react-lazy-load-image-component";

export function LazyImage({
  src,
  alt = "",
  className,
}: { src: string; alt?: string; className?: string }) {
  return (
    <LazyLoadComponent
      placeholder={<div className="w-full h-full bg-slate-100" />}
      visibleByDefault={false}
      threshold={300}
    >
      <img src={src} alt={alt} loading="lazy" className={className} />
    </LazyLoadComponent>
  );
}
