import { LevelIcon } from "./LevelIcon";
import { Photo } from "./Photo";
import { Price } from "./Price";
import { PackageExtras } from "./PackageCard";
import { LEVELS, LEVEL_LABEL, telHref, whatsappHref } from "@/lib/format";
import type { PackageDetail } from "@/lib/public";

type Contact = { name: string; phone: string | null; whatsapp: string | null };

// Basic / Standard / Premium cards for one photographer + service. These are the dedicated service page's
// own sections (no per-package pages exist).
export function TierCards({ pkgs, serviceName, contact }: { pkgs: PackageDetail[]; serviceName: string; contact: Contact }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {LEVELS.map((level) => {
        const k = pkgs.find((x) => x.level === level);
        if (!k) return null; // levels the photographer does not offer are not shown
        const tel = telHref(contact.phone);
        const wa = whatsappHref(contact.whatsapp, `Hi ${contact.name}, I'm interested in your ${serviceName} ${LEVEL_LABEL[level]} package.`);
        return (
          <section key={level} id={level} aria-label={`${LEVEL_LABEL[level]} package`} className={`card flex flex-col overflow-hidden ${level === "standard" ? "border-brand ring-1 ring-brand" : ""}`}>
            <div className="relative">
              <Photo src={k.images[0]?.url} alt={k.images[0]?.alt || k.name} className="aspect-[16/10]" />
              <div className="absolute inset-x-3 bottom-0 flex items-center justify-between gap-2 rounded-t-md border border-b-0 border-line bg-canvas px-4 py-2">
                <span className="flex items-center gap-1.5 text-sm font-bold"><LevelIcon level={level} />{LEVEL_LABEL[level]}</span>
                <Price base={k.basePrice} offer={k.offerPrice} size="text-base" />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold">{k.name}</h3>
              {k.inclusions.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {k.inclusions.map((i) => <li key={i} className="flex gap-2"><span>✓</span>{i}</li>)}
                </ul>
              )}
              <PackageExtras extras={k.extras} />
              {(wa || tel) && (
                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary">WhatsApp</a> : <span />}
                  {tel ? <a href={tel} className="btn-outline">Call Now</a> : <span />}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
