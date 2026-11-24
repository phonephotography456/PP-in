// Placeholder data for design review. Replace with DB queries later.
export const LEVELS = ["Basic", "Standard", "Premium"] as const;
export type Level = (typeof LEVELS)[number];

export const SERVICES = [
  { slug: "pre-wedding", name: "Pre-wedding" },
  { slug: "wedding", name: "Wedding" },
  { slug: "engagement", name: "Engagement" },
  { slug: "birthday", name: "Birthday" },
  { slug: "post-wedding", name: "Post-wedding" },
];

export const STATES = [
  { slug: "karnataka", name: "Karnataka", cities: ["Bengaluru", "Mysuru", "Mangaluru"] },
  { slug: "maharashtra", name: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur"] },
  { slug: "delhi", name: "Delhi", cities: ["New Delhi"] },
  { slug: "tamil-nadu", name: "Tamil Nadu", cities: ["Chennai", "Coimbatore"] },
  { slug: "rajasthan", name: "Rajasthan", cities: ["Jaipur", "Udaipur"] },
];

export const BRANDS = [
  { name: "Apple", models: ["iPhone 15 Pro", "iPhone 14", "iPhone 13"] },
  { name: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S23"] },
  { name: "Google", models: ["Pixel 8 Pro", "Pixel 7"] },
  { name: "OnePlus", models: ["OnePlus 12"] },
  { name: "Vivo", models: ["X100 Pro"] },
  { name: "Xiaomi", models: ["Xiaomi 14 Ultra"] },
];

export const PRICE_RANGES = [
  { id: "0-5000", label: "Under ₹5,000", min: 0, max: 5000 },
  { id: "5000-15000", label: "₹5,000 – ₹15,000", min: 5000, max: 15000 },
  { id: "15000-30000", label: "₹15,000 – ₹30,000", min: 15000, max: 30000 },
  { id: "30000-999999", label: "₹30,000 +", min: 30000, max: 999999 },
];

export type Photographer = {
  slug: string;
  name: string;
  owner: string;
  city: string;
  state: string; // state slug
  phones: string[];
  about: string;
  rating: number;
  reviews: number;
  services: string[]; // service slugs
};

export const PHOTOGRAPHERS: Photographer[] = [
  { slug: "sagar-neel-photography-bengaluru", owner: "Sagar Neel", name: "Sagar Neel Photography", city: "Bengaluru", state: "karnataka", phones: ["iPhone 15 Pro", "Pixel 8 Pro"], about: "Candid, light-filled stories shot entirely on iPhone. Six years capturing couples across Karnataka.", rating: 4.9, reviews: 48, services: ["pre-wedding", "wedding", "engagement"] },
  { slug: "pixel-tales-mumbai", owner: "Meera Shah", name: "Pixel Tales", city: "Mumbai", state: "maharashtra", phones: ["Galaxy S24 Ultra"], about: "Cinematic city portraits and celebrations with Galaxy Ultra optics.", rating: 4.8, reviews: 31, services: ["pre-wedding", "birthday", "post-wedding"] },
  { slug: "aarav-frames-pune", owner: "Aarav Patil", name: "Aarav Frames", city: "Pune", state: "maharashtra", phones: ["iPhone 14", "OnePlus 12"], about: "Warm, natural-light photography for engagements and family milestones.", rating: 4.7, reviews: 22, services: ["engagement", "wedding", "birthday"] },
  { slug: "lens-lore-delhi", owner: "Kabir Malhotra", name: "Lens & Lore", city: "New Delhi", state: "delhi", phones: ["Pixel 8 Pro"], about: "Editorial-style wedding and pre-wedding stories, mobile-first.", rating: 4.8, reviews: 40, services: ["pre-wedding", "wedding", "post-wedding"] },
  { slug: "kaveri-clicks-chennai", owner: "Kaveri Raman", name: "Kaveri Clicks", city: "Chennai", state: "tamil-nadu", phones: ["iPhone 13", "Xiaomi 14 Ultra"], about: "Joyful, colourful coverage for South Indian celebrations.", rating: 4.6, reviews: 17, services: ["wedding", "engagement", "birthday"] },
  { slug: "marwar-moments-jaipur", owner: "Vikram Rathore", name: "Marwar Moments", city: "Jaipur", state: "rajasthan", phones: ["X100 Pro", "iPhone 15 Pro"], about: "Palace-backdrop pre-wedding shoots with a modern, minimal eye.", rating: 4.9, reviews: 36, services: ["pre-wedding", "post-wedding", "wedding"] },
];

export type Pkg = {
  photographer: Photographer;
  service: { slug: string; name: string };
  level: Level;
  name: string;
  basePrice: number; // original price (struck through)
  price: number; // offer price (used for filters)
  travelExtra: boolean; // travel & accommodation charged extra
  costume: boolean;
  makeup: boolean;
  location: boolean;
  short: string;
  includes: string[];
  detail: string;
  seed: string;
};

const BASE: Record<Level, number> = { Basic: 4000, Standard: 12000, Premium: 28000 };
const SHORT: Record<Level, string> = {
  Basic: "A quick, focused shoot with edited highlights delivered fast.",
  Standard: "Extended coverage with more locations, outfits and edited photos.",
  Premium: "Full-day storytelling with reels, an album and priority delivery.",
};
const INCLUDES: Record<Level, string[]> = {
  Basic: ["1 hour shoot", "20 edited photos", "Online gallery"],
  Standard: ["3 hour shoot", "60 edited photos", "2 outfit changes", "Online gallery", "1 short reel"],
  Premium: ["Full-day coverage", "150 edited photos", "Unlimited outfits", "3 reels", "Printed album", "48-hour preview"],
};

export const PACKAGES: Pkg[] = PHOTOGRAPHERS.flatMap((p, i) =>
  p.services.flatMap((sv, j) => {
    const service = SERVICES.find((s) => s.slug === sv)!;
    return LEVELS.filter((l) => !(l === "Premium" && (i + j) % 5 === 0)).map((level) => {
      const price = Math.round((BASE[level] * (1 + i * 0.08 + j * 0.1)) / 500) * 500;
      return {
      photographer: p,
      service,
      level,
      name: `${service.name} ${level}`,
      basePrice: Math.round((price * 1.3) / 500) * 500,
      price,
      travelExtra: level !== "Premium",
      costume: level !== "Basic",
      makeup: level === "Premium",
      location: level !== "Basic",
      short: SHORT[level],
      includes: INCLUDES[level],
      detail: `${p.name} shoots ${service.name.toLowerCase()} sessions on ${p.phones.join(" and ")}. Every frame is hand-edited for natural colour and delivered through a private gallery.`,
      seed: `${p.slug}-${sv}-${level}`,
      };
    });
  }),
);

export type Filters = { service?: string; state?: string; city?: string; phone?: string; price?: string; level?: string; q?: string };

export function filterPackages(f: Filters): Pkg[] {
  const range = PRICE_RANGES.find((r) => r.id === f.price);
  const q = f.q?.trim().toLowerCase();
  return PACKAGES.filter(
    (k) =>
      (!f.service || k.service.slug === f.service) &&
      (!f.state || k.photographer.state === f.state) &&
      (!f.city || k.photographer.city === f.city) &&
      (!q || `${k.photographer.name} ${k.photographer.owner} ${k.photographer.city} ${stateName(k.photographer.state)} ${k.service.name}`.toLowerCase().includes(q)) &&
      (!f.level || k.level === f.level) &&
      (!f.phone || k.photographer.phones.includes(f.phone)) &&
      (!range || (k.price >= range.min && k.price < range.max)),
  );
}

export const stateName = (slug: string) => STATES.find((s) => s.slug === slug)?.name ?? slug;
export const serviceHref = (p: Photographer, service: string) => `/photographers/p/${p.slug}/${service}`;
export const discount = (base: number, offer: number) => Math.round(((base - offer) / base) * 100);
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const photoUrl = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

export const REVIEWS = [
  { name: "Ananya R.", rating: 5, date: "12 Oct 2026", text: "Felt natural from the first minute. The photos look like a magazine shoot — and all from a phone!" },
  { name: "Rohit M.", rating: 5, date: "28 Sep 2026", text: "Quick delivery, lovely colours and very easy to coordinate over WhatsApp." },
  { name: "Divya S.", rating: 4, date: "03 Sep 2026", text: "Great experience and fair price. Would have loved a few more locations." },
];

// One service's homepage row: 1 Basic, 2 Standard, 1 Premium (fills from leftovers if a tier is missing).
export function serviceMix(pkgs: Pkg[]): Pkg[] {
  const out: Pkg[] = [];
  for (const level of ["Basic", "Standard", "Standard", "Premium"] as Level[]) {
    const pick = pkgs.find((k) => k.level === level && !out.includes(k));
    if (pick) out.push(pick);
  }
  for (const k of pkgs) if (out.length < 4 && !out.includes(k)) out.push(k);
  return out;
}
