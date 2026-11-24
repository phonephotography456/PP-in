import Link from "next/link";
import { LevelIcon } from "./LevelIcon";
import { VerifiedSeal } from "./VerifiedRating";
import { Photo } from "./Photo";
import { Price } from "./Price";
import { LEVEL_LABEL, serviceHref, telHref, whatsappHref } from "@/lib/format";
import type { PackageCardData, PackageExtras as PackageExtrasData } from "@/lib/public";

// Global rule: every package card (stretched link) opens the photographer's page for that service.
// Call / WhatsApp buttons sit above the link.
export function PackageCard({ pkg }: { pkg: PackageCardData }) {
  const p = pkg.photographer;
  const tel = telHref(p.phone);
  const wa = whatsappHref(p.whatsapp, `Hi ${p.name}, I'm interested in your ${pkg.serviceName} ${LEVEL_LABEL[pkg.level]} package.`);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-canvas transition hover:border-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
      <div className="relative">
        <Photo src={pkg.image} alt={`${pkg.serviceName} by ${p.name}`} className="aspect-[16/9]" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-canvas px-2.5 py-1 text-xs font-bold"><LevelIcon level={pkg.level} size={16} />{LEVEL_LABEL[pkg.level]}</span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <Photo src={p.logo} alt={`${p.name} logo`} className="-mt-9 h-[72px] w-[72px] rounded-full border-4 border-canvas" />
        <h3 className="mt-3 flex items-center gap-1.5 text-lg font-bold leading-snug">
          <Link href={serviceHref(p.slug, pkg.serviceSlug)} className="after:absolute after:inset-0">{p.name}</Link>{" "}
          <VerifiedSeal size={18} />
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          <li className="badge-accent">{pkg.serviceName}</li>
          {p.phoneModel && <li className="badge">{p.phoneModel}</li>}
        </ul>
        <div className="mt-3"><Price base={pkg.basePrice} offer={pkg.offerPrice} /></div>
        <Location city={p.city} state={p.state} />
        <PackageExtras extras={pkg.extras} />
        <Contact tel={tel} wa={wa} />
      </div>
    </div>
  );
}

export function Location({ city, state }: { city: string | null; state: string | null }) {
  if (!city && !state) return null;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
      {[city, state].filter(Boolean).join(", ")}
    </p>
  );
}

// Lucide-style 24px outline icons, one per extra.
const EXTRAS = [
  { key: "travelStay", label: "Travel & Stay", icon: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></> },
  { key: "location", label: "Location", icon: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></> },
  { key: "makeup", label: "Makeup", icon: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 17v4M17 19h4" /></> },
  { key: "costume", label: "Costume", icon: <path d="M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0Z" /> },
] as const;

/** Boxes with icon on top, then the title, then a green tick (included) or red cross (not included). Items left blank are not shown. */
export function PackageExtras({ extras }: { extras: PackageExtrasData }) {
  const shown = EXTRAS.filter((e) => extras[e.key] !== null);
  if (!shown.length) return null;
  return (
    <ul className="mt-5 grid grid-flow-col auto-cols-fr gap-2">
      {shown.map((e) => {
        const on = extras[e.key] === true;
        return (
          <li key={e.key} className="flex min-w-0 flex-col items-center gap-0.5 rounded-md border border-line px-1 py-1.5 text-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{e.icon}</svg>
            <span className="text-[10px] font-medium leading-tight">{e.label}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={on ? "text-success" : "text-danger"} aria-label={on ? "Included" : "Not included"} role="img">
              {on ? <path d="m5 12 5 5 9-10" /> : <path d="M6 6l12 12M18 6 6 18" />}
            </svg>
          </li>
        );
      })}
    </ul>
  );
}

/** Call / WhatsApp buttons; each renders only when the photographer has that contact. */
export function Contact({ tel, wa }: { tel: string | null; wa: string | null }) {
  if (!tel && !wa) return null;
  return (
    <div className="relative z-10 mt-auto grid grid-cols-2 gap-3 pt-4">
      {tel ? <a href={tel} className="btn-primary">Call Now</a> : <span />}
      {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline">WhatsApp</a> : <span />}
    </div>
  );
}
