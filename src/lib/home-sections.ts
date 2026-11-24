/** Homepage sections the admin can switch on/off, in page order. Keys are stored in homepage_sections. */
export const HOME_SECTIONS = [
  { key: "banner", label: "Banner", hint: "Hero image and heading at the top." },
  { key: "filters", label: "Search filters", hint: "Service, location, phone and price filter bar." },
  { key: "cities", label: "Location strip", hint: "Round state and city logos under the filters." },
  { key: "packages", label: "Service package sections", hint: "One block of packages per service. Choose the services below." },
  { key: "featured", label: "Featured photographers", hint: "Cards chosen in the list further down." },
  { key: "states", label: "Browse states", hint: "State cards with city and photographer counts." },
  { key: "join", label: "Become a photographer", hint: "Call-to-action banner for new photographers." },
  { key: "services", label: "Browse services", hint: "List of all services at the bottom." },
  { key: "faq", label: "FAQs", hint: "Questions and answers at the very bottom (also helps search engines)." },
] as const;

export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["key"];
export const isHomeSectionKey = (v: unknown): v is HomeSectionKey => HOME_SECTIONS.some((s) => s.key === v);
