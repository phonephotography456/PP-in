import type { ReactNode } from "react";

export function StaticPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
      <div className="mt-8 space-y-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_p]:text-muted">{children}</div>
    </article>
  );
}
