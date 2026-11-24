import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/Photo";
import { ReadMore } from "@/components/ReadMore";
import { ReviewsSection } from "@/components/ReviewsSection";
import { VerifiedRating } from "@/components/VerifiedRating";
import { ServicePicker } from "@/components/ServicePicker";
import { SocialLinks } from "@/components/SocialLinks";
import { TierCards } from "@/components/TierCards";
import { PACKAGES, PHOTOGRAPHERS, SERVICES, stateName } from "@/lib/mock";

export function generateStaticParams() {
  return PHOTOGRAPHERS.flatMap((p) => p.services.map((service) => ({ slug: p.slug, service })));
}

export default async function ServicePage({ params }: PageProps<"/photographers/p/[slug]/[service]">) {
  const { slug, service } = await params;
  const p = PHOTOGRAPHERS.find((x) => x.slug === slug);
  const pkgs = PACKAGES.filter((k) => k.photographer.slug === slug && k.service.slug === service);
  if (!p || !pkgs.length) notFound();
  const s = pkgs[0].service;

  return (
    <article>
      {/* Banner (full width) */}
      <Photo seed={`${p.slug}-cover`} alt={`${p.name} banner`} className="h-48 sm:h-72" priority />

      <div className="container-page">
        {/* DP + name + 2-line intro */}
        <header className="-mt-12 sm:-mt-14">
          <Photo seed={`${p.slug}-profile`} alt={p.name} className="h-24 w-24 rounded-full border-4 border-white sm:h-28 sm:w-28" priority />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                <Link href={`/photographers/p/${p.slug}`} className="hover:underline">{p.name}</Link>
                <VerifiedRating rating={p.rating} reviews={p.reviews} />
              </h1>
              <p className="mb-2 text-sm text-muted">{s.name} · {p.city}, {stateName(p.state)} · Shot on {p.phones.join(", ")}</p>
              <ReadMore text={`${p.about} ${pkgs[0].detail}`} />
            </div>
            <div className="flex shrink-0 flex-col items-center gap-3">
              <a href="https://wa.me/910000000000" className="btn-primary">Enquire on WhatsApp</a>
              <SocialLinks />
            </div>
          </div>
        </header>

      {/* All three tiers for this photographer + service */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Packages</h2>
        <div className="mt-5">
          <ServicePicker
            defaultSlug={service}
            options={SERVICES.filter((x) => p.services.includes(x.slug)).map((x) => ({
              slug: x.slug,
              name: x.name,
              href: `/photographers/p/${p.slug}/${x.slug}`,
              content: <TierCards pkgs={PACKAGES.filter((k) => k.photographer.slug === p.slug && k.service.slug === x.slug)} />,
            }))}
          />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">{s.name} portfolio</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Photo key={i} seed={`${p.slug}-${service}-portfolio-${i}`} alt={`${s.name} portfolio ${i + 1}`} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </section>

      <ReviewsSection rating={p.rating} />
      </div>
    </article>
  );
}
