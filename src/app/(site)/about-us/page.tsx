import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <StaticPage title="About Us" intro="A focused directory for photographers who shoot on smartphones.">
      <section>
        <h2>What we do</h2>
        <p>PhonePhotography.in helps customers find smartphone photographers and compare their service packages by service, location, phone model and price. Customers contact photographers directly through WhatsApp or phone.</p>
      </section>
      <section>
        <h2>For photographers</h2>
        <p>Photographers create a profile, list Basic, Standard and Premium packages for each service, and share a portfolio. Every profile is reviewed by our team before it goes live.</p>
      </section>
      <section>
        <h2>Our approach</h2>
        <p>We keep things simple: no online booking and no payment processing. We connect customers and photographers, and the booking is agreed between them.</p>
      </section>
    </StaticPage>
  );
}
