import { Inclusions } from "./Inclusions";
import { LevelIcon } from "./LevelIcon";
import { Photo } from "./Photo";
import { Price } from "./Price";
import { ReadMore } from "./ReadMore";
import { LEVELS, type Pkg } from "@/lib/mock";

// Basic / Standard / Premium cards for one photographer + service.
export function TierCards({ pkgs }: { pkgs: Pkg[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {LEVELS.map((level) => {
        const k = pkgs.find((x) => x.level === level);
        if (!k) {
          return (
            <div key={level} className="card grid place-items-center border-dashed p-8 text-center text-sm text-muted">
              <div><p className="font-semibold text-ink">{level}</p><p className="mt-1">Not offered for this service</p></div>
            </div>
          );
        }
        return (
          <div key={level} className={`card flex flex-col overflow-hidden ${level === "Standard" ? "border-brand ring-1 ring-brand" : ""}`}>
            <div className="relative">
              <Photo seed={k.seed} alt={k.name} className="aspect-[16/10]" />
              <div className="absolute inset-x-3 bottom-0 flex items-center justify-between gap-2 rounded-t-md border border-b-0 border-line bg-white px-4 py-2">
                <span className="flex items-center gap-1.5 text-sm font-bold"><LevelIcon level={level} />{level}</span>
                <Price base={k.basePrice} offer={k.price} size="text-base" />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold">{k.name}</h3>
              <div className="mt-1 text-sm"><ReadMore text={`${k.short} ${k.detail}`} /></div>
              <ul className="mt-3 space-y-1 text-sm">
                {k.includes.map((i) => <li key={i} className="flex gap-2"><span>✓</span>{i}</li>)}
              </ul>
              <div className="mt-auto pt-4"><Inclusions pkg={k} /></div>
              <div className="grid grid-cols-2 gap-2 pt-3">
                <a href="tel:+910000000000" className="btn-primary">Call Now</a>
                <a href="https://wa.me/910000000000" className="btn-outline">WhatsApp</a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
