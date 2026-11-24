import { PhotographerCard } from "@/components/PhotographerCard";
import { PHOTOGRAPHERS } from "@/lib/mock";

export const metadata = { title: "Browse photographers" };

export default function PhotographersPage() {
  return (
    <section className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Browse photographers</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid">
        {PHOTOGRAPHERS.map((p) => <PhotographerCard key={p.slug} p={p} />)}
      </div>
    </section>
  );
}
