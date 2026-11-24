// Client-safe helpers shared by public pages and components.
export const LEVELS = ["basic", "standard", "premium"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { basic: "Basic", standard: "Standard", premium: "Premium" };

// Price filters use offer_price. min inclusive, max exclusive.
export const PRICE_RANGES = [
  { id: "0-5000", label: "Under ₹5,000", min: 0, max: 5000 },
  { id: "5000-15000", label: "₹5,000 – ₹15,000", min: 5000, max: 15000 },
  { id: "15000-30000", label: "₹15,000 – ₹30,000", min: 15000, max: 30000 },
  { id: "30000-999999999", label: "₹30,000 +", min: 30000, max: 999999999 },
];

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const discount = (base: number, offer: number) => (base > offer ? Math.round(((base - offer) / base) * 100) : 0);

const digits = (s: string) => s.replace(/\D/g, "");
export const telHref = (phone: string | null) => (phone ? `tel:+${waNumber(phone)}` : null);
/** wa.me needs country code + digits only; bare 10-digit numbers are Indian. */
const waNumber = (s: string) => {
  const d = digits(s);
  return d.length === 10 ? `91${d}` : d;
};
export const whatsappHref = (n: string | null, text?: string) =>
  n ? `https://wa.me/${waNumber(n)}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;

/**
 * Video id from a YouTube link (watch, youtu.be, shorts, embed, live; with or without www/m), or null.
 * Only an 11-character [A-Za-z0-9_-] id is ever kept, so nothing else from the URL reaches the page.
 */
export function youtubeId(input: string | null | undefined): string | null {
  const url = URL.parse((input ?? "").trim());
  if (!url || url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (host === "youtube.com") {
    const [, kind, rest] = url.pathname.split("/");
    id = kind === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live"].includes(kind) ? rest : null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** A photographer has one page; ?service= picks which of their services it shows. */
export const serviceHref = (photographerSlug: string, serviceSlug: string) => `/photographers/p/${photographerSlug}?service=${serviceSlug}`;
