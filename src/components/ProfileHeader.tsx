import { Photo } from "./Photo";
import { PhotoGallery } from "./PhotoGallery";
import { ReadMore } from "./ReadMore";
import { SocialLinks } from "./SocialLinks";
import { VerifiedBadge } from "./VerifiedRating";
import { telHref, whatsappHref } from "@/lib/format";
import type { getProfile } from "@/lib/public";

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/** Banner + identity block of the photographer page. */
export function ProfileHeader({ p, subtitle, intro }: { p: Profile; subtitle?: string; intro?: string | null }) {
  const avatar = p.profilePhoto ?? p.logo;
  const tel = telHref(p.phone);
  const wa = whatsappHref(p.whatsapp, `Hi ${p.name}, I found you on PhonePhotography.in.`);
  const brands = [...new Set(p.models.map((m) => m.brand))].map((b) => ({ brand: b, models: p.models.filter((m) => m.brand === b).map((m) => m.model) }));
  const place = [p.city, p.state].filter(Boolean).join(", ");

  return (
    <>
      <Photo src={p.banner} alt={`${p.name} banner`} className="h-48 sm:h-72" priority />
      <div className="container-page">
        <header className="-mt-12 sm:-mt-14">
          <div className="flex items-end gap-3">
            <Photo src={avatar} alt={p.name} className="h-24 w-24 shrink-0 rounded-full border-4 border-canvas sm:h-28 sm:w-28" priority />
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {p.name}
                <VerifiedBadge />
              </h1>
              <p className="mb-2 text-sm text-muted">{[subtitle, place].filter(Boolean).join(" · ")}</p>
              {brands.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2" aria-label="Smartphones used">
                  {brands.map((b) => <li key={b.brand} className="badge"><span className="font-semibold">{b.brand}:</span> {b.models.join(", ")}</li>)}
                </ul>
              )}
              {intro && <ReadMore text={intro} />}
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <div className="flex gap-2">
                {tel && <a href={tel} className="btn-primary">Call Now</a>}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline">WhatsApp</a>}
              </div>
              <SocialLinks instagram={p.instagram} youtube={p.youtube} website={p.website} />
            </div>
          </div>
        </header>
      </div>
    </>
  );
}

type Img = { url: string; alt: string | null };

/** One service's portfolio: heading, then up to 3 YouTube videos, then up to 8 approved photos (4 per row, 2 rows). */
export function PortfolioGrid({ videos, images, title, empty }: { videos: string[]; images: Img[]; title: string; empty: string }) {
  return (
    <section className="mt-14">
      <h2 className="heading-section">{title}</h2>
      {!videos.length && !images.length && <p className="mt-4 text-sm text-muted">{empty}</p>}
      {videos.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 font-semibold">Videos</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {videos.map((id) => (
              <iframe
                key={id}
                src={`https://www.youtube-nocookie.com/embed/${id}`}
                title={`${title} video`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media; picture-in-picture; fullscreen"
                className="aspect-video w-full rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        </div>
      )}
      {images.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 font-semibold">Photos</h3>
          <PhotoGallery images={images} title={title} />
        </div>
      )}
    </section>
  );
}
