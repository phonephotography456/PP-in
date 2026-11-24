import Image from "next/image";

// Real image (R2 URL) or a neutral placeholder block when none is uploaded. `unoptimized`: images are
// already resized WebP on R2, so no remote image config is needed.
export function Photo({ src, alt, className = "", priority = false }: { src: string | null | undefined; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {src ? <Image src={src} alt={alt} fill unoptimized priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" /> : null}
    </div>
  );
}
