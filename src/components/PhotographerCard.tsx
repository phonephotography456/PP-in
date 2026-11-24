import Link from "next/link";
import { Contact, Location } from "./PackageCard";
import { Photo } from "./Photo";
import { VerifiedSeal } from "./VerifiedRating";
import { serviceHref, telHref, whatsappHref } from "@/lib/format";
import type { PhotographerCardData } from "@/lib/public";

// `service` (slug): the service the visitor filtered by, opened first on the profile.
// Cover + overlapping logo, service chips, location, Call / WhatsApp. Whole card links to the profile.
export function PhotographerCard({ p, service, viewServices = false }: { p: PhotographerCardData; service?: string; viewServices?: boolean }) {
  const href = service ? serviceHref(p.slug, service) : `/photographers/p/${p.slug}`;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-canvas transition hover:border-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
      <Photo src={p.cover} alt={`${p.name} cover`} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <Photo src={p.logo} alt={`${p.name} logo`} className="-mt-9 h-[72px] w-[72px] rounded-full border-4 border-canvas" />
        <h3 className="mt-3 text-lg font-bold leading-snug">
          <Link href={href} className="after:absolute after:inset-0">{p.name}</Link>
          <span className="ml-1.5 inline-block align-[-3px]"><VerifiedSeal size={18} /></span>
        </h3>
        {p.phoneModel && <p className="text-sm text-muted">Shot on {p.phoneModel}</p>}
        {p.services.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.services.map((s) => <li key={s} className="badge">{s}</li>)}
          </ul>
        )}
        {/* mt-auto pins location + action to the card bottom so cards in a row line up */}
        <div className="mt-auto">
          <Location city={p.city} state={p.state} />
          {viewServices
            ? <Link href={href} className="btn-primary relative mt-4 w-full">View services</Link>
            : <Contact tel={telHref(p.phone)} wa={whatsappHref(p.whatsapp, `Hi ${p.name}, I found you on PhonePhotography.in.`)} />}
        </div>
      </div>
    </div>
  );
}
