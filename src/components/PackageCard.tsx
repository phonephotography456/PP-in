import Link from "next/link";
import { LevelIcon } from "./LevelIcon";
import { VerifiedSeal } from "./VerifiedRating";
import { Photo } from "./Photo";
import { Price } from "./Price";
import { serviceHref, stateName, type Pkg } from "@/lib/mock";

// Same look as PhotographerCard. Global rule: the card (stretched link) opens the
// photographer's service page; Call / WhatsApp buttons sit above the link.
export function PackageCard({ pkg }: { pkg: Pkg }) {
  const { photographer: p } = pkg;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-line transition hover:border-ink">
      <div className="relative">
        <Photo seed={pkg.seed} alt={`${pkg.service.name} by ${p.name}`} className="aspect-[16/9]" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-white px-2.5 py-1 text-xs font-bold"><LevelIcon level={pkg.level} size={16} />{pkg.level}</span>
      </div>
      <div className="px-5 pb-5">
        <Photo seed={`${p.slug}-profile`} alt={`${p.name} logo`} className="-mt-9 h-[72px] w-[72px] rounded-full border-4 border-white" />
        <h3 className="mt-3 flex items-center gap-1.5 text-lg font-bold leading-snug">
          <Link href={serviceHref(p, pkg.service.slug)} className="after:absolute after:inset-0">{p.name}</Link>{" "}
          <VerifiedSeal size={18} />
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm"><span aria-hidden>★</span><span className="font-semibold">{p.rating}</span><span className="text-muted">({p.reviews} reviews)</span></p>
        <ul className="mt-2 flex flex-wrap gap-2">
          <li className="rounded-sm bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{pkg.service.name}</li>
          <li className="rounded-sm bg-surface px-3 py-1 text-xs font-medium">{p.phones[0]}</li>
        </ul>
        <div className="mt-3"><Price base={pkg.basePrice} offer={pkg.price} /></div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          {p.city}, {stateName(p.state)}
        </p>
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
          <a href="tel:+910000000000" className="btn-primary">Call Now</a>
          <a href="https://wa.me/910000000000" className="btn-outline">WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
