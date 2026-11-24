/** Server-rendered JSON-LD. `<` is escaped so page data (names, about text) can never close the script tag. */
const LT = String.fromCharCode(92) + "u003c"; // the six characters: backslash u 0 0 3 c

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replaceAll("<", LT);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
