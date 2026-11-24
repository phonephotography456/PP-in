import Link from "next/link";
import { VerifiedSeal } from "./VerifiedRating";
import { Photo } from "./Photo";
import { SERVICES, stateName, type Photographer } from "@/lib/mock";

// Cover + overlapping logo, services chips, location, Call / WhatsApp.
// Whole card is clickable via a stretched link; buttons sit above it.
export function PhotographerCard({ p, profileOnly = false }: { p: Photographer; profileOnly?: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-line transition hover:border-ink">
      <Photo seed={`${p.slug}-cover`} alt={`${p.name} cover`} className="aspect-[16/9]" />
      <div className="px-5 pb-5">
        <Photo seed={`${p.slug}-profile`} alt={`${p.name} logo`} className="-mt-9 h-[72px] w-[72px] rounded-full border-4 border-white " />
        <h3 className="mt-3 flex items-center gap-1.5 text-lg font-bold leading-snug">
          <Link href={`/photographers/p/${p.slug}`} className="after:absolute after:inset-0">{p.name}</Link>{" "}
          <VerifiedSeal size={18} />
        </h3>
        <p className="text-sm text-muted">{p.owner}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm"><span aria-hidden>★</span><span className="font-semibold">{p.rating}</span><span className="text-muted">({p.reviews} reviews)</span></p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.services.map((sv) => (
            <li key={sv} className="rounded-sm bg-surface px-3 py-1 text-xs font-medium">{SERVICES.find((s) => s.slug === sv)?.name}</li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          {p.city}, {stateName(p.state)}
        </p>
        {profileOnly ? (
          <Link href={`/photographers/p/${p.slug}`} className="btn-primary relative z-10 mt-4 w-full">View Profile</Link>
        ) : (
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
            <a href="tel:+910000000000" className="btn-primary">Call Now</a>
            <a href="https://wa.me/910000000000" className="btn-outline">WhatsApp</a>
          </div>
        )}
      </div>
    </div>
  );
}
