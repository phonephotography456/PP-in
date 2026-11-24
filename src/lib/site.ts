// Site-wide constants for SEO. Set NEXT_PUBLIC_SITE_URL per environment (no trailing slash).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonephotography.in").replace(/\/+$/, "");
export const SITE_NAME = "PhonePhotography.in";

/** Real business contact details. Never invented: unset values render as a clearly marked placeholder. */
export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || null,
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || null,
};

/** Canonical absolute URL for a site path: no trailing slash (the root is the bare origin, as Next renders it), no query, no fragment. */
export const canonicalUrl = (path: string) => {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return `${SITE_URL}${p}`;
};
