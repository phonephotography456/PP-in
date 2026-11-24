import { StaticPage } from "@/components/StaticPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/terms-and-conditions",
  title: "Terms & Conditions",
  description: "Terms for using PhonePhotography.in, a directory where customers find smartphone photographers and contact them directly.",
});

// Placeholder wording. Have it reviewed before launch.
export default function TermsPage() {
  return (
    <StaticPage title="Terms & Conditions" intro="Last updated: November 2026. Draft text for review.">
      <section>
        <h2>Using the site</h2>
        <p>PhonePhotography.in is a directory. We list photographers and their packages so customers can contact them. We are not a party to any booking between a customer and a photographer.</p>
      </section>
      <section>
        <h2>Photographer accounts</h2>
        <p>Photographers must give accurate information. Profiles, packages and portfolio images are reviewed by our team and may be rejected, hidden or removed.</p>
      </section>
      <section>
        <h2>Prices and services</h2>
        <p>Prices and inclusions are set by each photographer. Please confirm details, including travel, costume, makeup and location, with the photographer before booking.</p>
      </section>
      <section>
        <h2>Reviews</h2>
        <p>Only signed-in users can submit reviews. Every review is checked by our team before it is published, and we may reject reviews that are abusive, false or off-topic.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We may update these terms from time to time. Continued use of the site means you accept the updated terms.</p>
      </section>
    </StaticPage>
  );
}
