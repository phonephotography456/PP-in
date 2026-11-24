import type { Metadata } from "next";
import { SITE_NAME } from "./site";

const clip = (s: string, n = 158) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
};

/** Only real uploaded images (absolute https URLs, e.g. R2) are shared. Relative /seed/* files are dev placeholders. */
export const shareImage = (...urls: (string | null | undefined)[]) => urls.find((u): u is string => !!u && /^https:\/\//i.test(u));

type Args = {
  /** Site path of the canonical URL (relative; metadataBase makes it absolute). Query strings are not canonical. */
  path: string;
  title: string;
  description: string;
  /** Use `{ absolute }` semantics: skip the "| PhonePhotography.in" title suffix (homepage). */
  absoluteTitle?: boolean;
  index?: boolean;
  image?: string;
  type?: "website" | "profile";
};

/** One place for title, description, canonical, robots, Open Graph and Twitter tags. */
export function pageMetadata({ path, title, description, absoluteTitle = false, index = true, image, type = "website" }: Args): Metadata {
  const desc = clip(description);
  const full = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: full, description: desc, url: path, siteName: SITE_NAME, locale: "en_IN", type: type === "profile" ? "website" : type, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: full, description: desc, ...(image ? { images: [image] } : {}) },
  };
}

export const withPage = (title: string, page: number) => (page > 1 ? `${title} – Page ${page}` : title);
export const pagePath = (path: string, page: number) => (page > 1 ? `${path}?page=${page}` : path);
/** True when any listing filter (other than paging) is set: such URLs are duplicates of the unfiltered page. */
export const isFiltered = (f: Record<string, unknown>) => Object.entries(f).some(([k, v]) => k !== "page" && !!v);
/** Page 1 always; later pages only while they hold results. */
export const pageInRange = (page: number, total: number, size: number) => page === 1 || page <= Math.ceil(total / size);
export { clip };
