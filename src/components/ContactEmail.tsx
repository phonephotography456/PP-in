import { CONTACT } from "@/lib/site";

/** The real contact email, or a clearly marked placeholder until NEXT_PUBLIC_CONTACT_EMAIL is set. */
export function ContactEmail() {
  return CONTACT.email ? <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a> : <em>[contact email to be added before launch]</em>;
}
