import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, profileJsonLd, serviceJsonLd } from "@/lib/jsonld";
import { PortfolioGrid, ProfileHeader } from "@/components/ProfileHeader";
import { Reviews } from "@/components/Reviews";
import { TierCards } from "@/components/TierCards";
import { serviceHref } from "@/lib/format";
import { getProfile, getProfileService } from "@/lib/public";
import { clip, pageMetadata, shareImage } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/photographers/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfile(slug);
  if (!p) return { title: "Page not found", robots: { index: false } };
  const place = [p.city, p.state].filter(Boolean).join(", ");
  const offers = p.services.map((s) => s.name).join(", ");
  return pageMetadata({
    path: `/photographers/p/${p.slug}`,
    title: `${p.name} – smartphone photographer${p.city || p.state ? ` in ${p.city ?? p.state}` : ""}`,
    description: p.about
      ? clip(p.about)
      : `${p.name} is a smartphone photographer${place ? ` in ${place}` : ""}${offers ? ` offering ${offers}` : ""}. View packages and portfolio.`,
    index: p.services.length > 0, // a profile with no published package has nothing to offer a searcher yet
    image: shareImage(p.banner, p.profilePhoto, p.logo),
    type: "profile",
  });
}

export default function ProfilePage({ params, searchParams }: PageProps<"/photographers/p/[slug]">) {
  return (
    <>
    <Suspense fallback={<div className="container-page py-16 text-sm text-muted">Loading profile…</div>}>
      <Profile params={params} searchParams={searchParams} />
    </Suspense>
    </>
  );
}

async function Profile({ params, searchParams }: Pick<PageProps<"/photographers/p/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const { service } = await searchParams;
  const p = await getProfile(slug);
  if (!p) notFound();
  // One page per photographer. The selected service (?service=, default: the first) is shown; the others are tabs.
  const wanted = typeof service === "string" ? service : undefined;
  const current = p.services.find((s) => s.slug === wanted) ?? p.services[0];
  const offer = current ? await getProfileService(slug, current.slug) : null;
  const contact = { name: p.name, phone: p.phone, whatsapp: p.whatsapp };
  // Location pages exist only for an active state + city (getProfile drops inactive ones).
  const statePath = p.stateSlug ? `/photographers/${p.stateSlug}` : null;
  const cityPath = statePath && p.citySlug ? `${statePath}/${p.citySlug}` : null;
  const crumbs = [
    { name: "Photographers", path: "/photographers" },
    ...(statePath && p.state ? [{ name: p.state, path: statePath }] : []),
    ...(cityPath && p.city ? [{ name: p.city, path: cityPath }] : []),
    { name: p.name, path: `/photographers/p/${p.slug}` },
  ];

  return (
    <article>
      <JsonLd data={{ "@graph": [profileJsonLd(p), ...(offer ? [serviceJsonLd(p, offer)] : []), breadcrumbJsonLd(crumbs)] }} />
      <nav aria-label="Breadcrumb" className="container-page py-3 text-sm text-muted">
        {crumbs.slice(0, -1).map((c) => <span key={c.path}><Link href={c.path} className="hover:underline">{c.name}</Link> / </span>)}
        {p.name}
      </nav>
      <ProfileHeader p={p} subtitle={current?.name} intro={p.about} />
      <div className="container-page">
        {p.services.length > 1 && (
          <nav aria-label="Services" className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Other services</span>
            {p.services.map((x) => {
              const active = x.slug === current?.slug;
              return (
                <Link key={x.slug} href={serviceHref(p.slug, x.slug)} scroll={false} aria-current={active ? "true" : undefined}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold ${active ? "border-ink bg-ink text-on-brand" : "border-line hover:border-ink"}`}>{x.name}</Link>
              );
            })}
          </nav>
        )}
        {offer ? (
          <section className="mt-8">
            <h2 className="heading-section">{offer.service.name} packages</h2>
            <div className="mt-5"><TierCards pkgs={offer.packages} serviceName={offer.service.name} contact={contact} /></div>
          </section>
        ) : (
          <p className="mt-10 text-sm text-muted">No packages published yet.</p>
        )}
        {offer && <PortfolioGrid videos={offer.videos} images={offer.portfolio} title={`${offer.service.name} portfolio`} empty={`No ${offer.service.name.toLowerCase()} portfolio images yet.`} />}
        {offer && <div className="pb-4"><Reviews photographerId={p.id} serviceId={offer.service.id} targets={offer.reviewTargets} path={serviceHref(p.slug, offer.service.slug)} reviews={offer.reviews} /></div>}
        {cityPath && (
          <nav aria-labelledby="more-title" className="mt-12 border-t border-line pt-8">
            <h2 id="more-title" className="text-base font-bold">More photographers in {p.city}</h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {p.services.map((x) => <li key={x.slug}><Link href={`${cityPath}/${x.slug}`} className="rounded-md border border-line px-3 py-1.5 font-medium hover:border-ink">{x.name} photographers in {p.city}</Link></li>)}
              <li><Link href={cityPath} className="rounded-md border border-line px-3 py-1.5 font-medium hover:border-ink">All photographers in {p.city}</Link></li>
            </ul>
          </nav>
        )}
      </div>
    </article>
  );
}
