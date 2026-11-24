import { notFound } from "next/navigation";
import { Photo } from "@/components/Photo";
import { ReadMore } from "@/components/ReadMore";
import { ReviewsSection } from "@/components/ReviewsSection";
import { VerifiedRating } from "@/components/VerifiedRating";
import { ServicePicker } from "@/components/ServicePicker";
import { TierCards } from "@/components/TierCards";
import { PACKAGES, PHOTOGRAPHERS, SERVICES, stateName } from "@/lib/mock";

export function generateStaticParams() {
  return PHOTOGRAPHERS.map((p) => ({ slug: p.slug }));
}

export default async function ProfilePage({ params }: PageProps<"/photographers/p/[slug]">) {
  const { slug } = await params;
  const p = PHOTOGRAPHERS.find((x) => x.slug === slug);
  if (!p) notFound();
  const services = SERVICES.filter((s) => p.services.includes(s.slug));

  return (
    <article>
      <Photo seed={`${p.slug}-cover`} alt={`${p.name} banner`} className="h-48 sm:h-72" priority />

      <div className="container-page">
        <header className="-mt-12 sm:-mt-14">
          <Photo seed={`${p.slug}-profile`} alt={p.name} className="h-24 w-24 rounded-full border-4 border-white sm:h-28 sm:w-28" priority />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {p.name}
                <VerifiedRating rating={p.rating} reviews={p.reviews} />
              </h1>
              <p className="mb-2 text-sm text-muted">{p.city}, {stateName(p.state)} · Shot on {p.phones.join(", ")}</p>
              <ReadMore text={p.about} />
            </div>
            <div className="flex shrink-0 gap-2">
              <a href="tel:+910000000000" className="btn-primary">Call Now</a>
              <a href="https://wa.me/910000000000" className="btn-outline">WhatsApp</a>
            </div>
          </div>
        </header>

        {/* Packages: pick one of this photographer's services to see its 3 packages */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Packages</h2>
          <div className="mt-5">
            <ServicePicker
              options={services.map((s) => ({
                slug: s.slug,
                name: s.name,
                href: `/photographers/p/${p.slug}/${s.slug}`,
                content: <TierCards pkgs={PACKAGES.filter((k) => k.photographer.slug === p.slug && k.service.slug === s.slug)} />,
              }))}
            />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Photo key={i} seed={`${p.slug}-portfolio-${i}`} alt={`${p.name} gallery ${i + 1}`} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </section>

        <ReviewsSection rating={p.rating} />
      </div>
    </article>
  );
}
