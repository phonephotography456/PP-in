import Image from "next/image";
import { photoUrl } from "@/lib/mock";

// Placeholder photo. `unoptimized` avoids remote image config for design mocks.
export function Photo({ seed, alt, className = "", priority = false }: { seed: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      <Image src={photoUrl(seed, 1000, 800)} alt={alt} fill unoptimized priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
    </div>
  );
}
