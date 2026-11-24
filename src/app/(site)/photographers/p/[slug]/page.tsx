import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { JsonLd } from "@/components/JsonLd";
import { profileJsonLd, serviceJsonLd } from "@/lib/jsonld";
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
    title: `${p.name} – smartphone photographer${place ? ` in ${place}` : ""}`,
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

  return (
    <article>
      <JsonLd data={profileJsonLd(p)} />
      {offer && <JsonLd data={serviceJsonLd(p, offer)} />}
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
      </div>
    </article>
  );
}
