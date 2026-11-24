import { JsonLd } from "./JsonLd";
import { HOME_FAQS } from "@/lib/faqs";

/** Accordion built on native <details> (no client JS, works without scripts). Also emits FAQPage JSON-LD for search engines. */
export function Faq() {
  return (
    <section className="container-page pt-16" aria-labelledby="faq-title">
      <JsonLd data={{
        "@type": "FAQPage",
        mainEntity: HOME_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 id="faq-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">FAQs</h2>
        <div className="divide-y divide-line border-b border-line">
          {HOME_FAQS.map((f, i) => (
            <details key={f.q} name="home-faq" open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-bold sm:text-lg [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <p className="pb-6 pr-10 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
