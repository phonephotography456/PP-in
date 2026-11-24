import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Privacy Policy" };

// Placeholder wording. Have it reviewed before launch.
export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy" intro="Last updated: November 2026. Draft text for review.">
      <section>
        <h2>Information we collect</h2>
        <p>For photographers: name, phone, WhatsApp number, email, location, social links, photos and package details. For reviewers: name, email and the reviews you submit.</p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>We use this information to run the directory, show approved profiles and packages, verify accounts, moderate content and send account emails such as OTP codes.</p>
      </section>
      <section>
        <h2>What is public</h2>
        <p>Approved photographer profiles, published packages, approved portfolio images and approved reviews are visible to everyone. Pending and rejected content is not.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You can update or delete your account details from your account settings, or contact us to have your data removed.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about privacy? Email hello@phonephotography.in.</p>
      </section>
    </StaticPage>
  );
}
