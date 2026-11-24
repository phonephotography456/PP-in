import { CONTACT } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { StaticPage } from "@/components/StaticPage";

export const metadata = pageMetadata({
  path: "/contact-us",
  title: "Contact Us",
  description: "Contact PhonePhotography.in about listing as a photographer, your account or finding a photographer.",
});

const WAY = (label: string, value: string | null, href: string | null) => ({ label, value, href });

export default function ContactPage() {
  const ways = [
    WAY("Email", CONTACT.email, CONTACT.email && `mailto:${CONTACT.email}`),
    WAY("Phone", CONTACT.phone, CONTACT.phone && `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`),
    WAY("WhatsApp", CONTACT.whatsapp, CONTACT.whatsapp && `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`),
  ];
  return (
    <StaticPage title="Contact Us" intro="Questions about listing as a photographer, your account or finding a photographer?">
      <section>
        <h2>Get in touch</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ways.map(({ label, value, href }) => {
            const body = (
              <>
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-0.5 break-words font-semibold text-ink">{value ?? <em className="font-normal text-muted">[to be added before launch]</em>}</p>
              </>
            );
            return href ? <a key={label} href={href} className="card block p-5 transition hover:border-ink">{body}</a> : <div key={label} className="card p-5">{body}</div>;
          })}
        </div>
      </section>
      <section>
        <h2>Enquiring about a photographer?</h2>
        <p>Each photographer lists their own phone and WhatsApp number on their profile and service pages. Contact them directly: PhonePhotography.in does not handle bookings or payments.</p>
      </section>
      <section>
        <h2>Want to list your services?</h2>
        <p>Register as a photographer from the &ldquo;Become a Photographer&rdquo; link in the menu. Our team reviews every profile before it goes live.</p>
      </section>
    </StaticPage>
  );
}
