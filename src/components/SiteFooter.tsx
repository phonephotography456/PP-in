import Link from "next/link";
import { SERVICES } from "@/lib/mock";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      ["Home", "/"],
      ["Search", "/search"],
      ["Locations", "/locations"],
      ["Earn", "/earn"],
      ["Contact", "/contact-us"],
    ],
  },
  { title: "Services", links: SERVICES.map((s) => [s.name, `/services/${s.slug}`]) },
  {
    title: "Photographers",
    links: [
      ["Browse Photographers", "/photographers"],
      ["Become a Photographer", "/photographer/register"],
      ["Photographer Login", "/photographer/login"],
      ["User Login", "/reviewer/login"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "/about-us"],
      ["Contact Us", "/contact-us"],
      ["Privacy Policy", "/privacy-policy"],
      ["Terms & Conditions", "/terms-and-conditions"],
    ],
  },
];

const SOCIAL = [
  ["Instagram", "https://instagram.com"],
  ["YouTube", "https://youtube.com"],
  ["Facebook", "https://facebook.com"],
];

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-sm text-ink">P</span>
            PhonePhotography
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Find smartphone photographers across India, compare packages and contact them directly.
          </p>
          <address className="mt-5 space-y-1 text-sm not-italic text-white/70">
            <p><a href="mailto:hello@phonephotography.in" className="hover:text-white">hello@phonephotography.in</a></p>
            <p><a href="tel:+910000000000" className="hover:text-white">+91 00000 00000</a></p>
          </address>
        </div>

        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-bold uppercase tracking-wider">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-3 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PhonePhotography.in. All rights reserved.</p>
          <ul className="flex gap-5">
            {SOCIAL.map(([label, href]) => (
              <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-white">{label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
