import Link from "next/link";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/about-us",
  title: "About Us",
  description:
    "PhonePhotography.in is a new venture creating real work for talented smartphone photographers in India, and giving customers professional photography they can afford.",
});

const WHY = [
  ["Cameras got good", "Flagship phones now shoot sharp, colour-accurate photos and 4K video. For events, products, portraits and social content, the phone is often all you need."],
  ["Demand is everywhere", "Small businesses, restaurants, boutiques, families and creators need good visuals often and on a budget. A full studio is more than many of them want to pay for."],
  ["Talent without opportunity", "Many skilled phone photographers had no steady way to turn their talent into a job. We started this venture to create that opportunity."],
];

const CUSTOMER_GAINS = [
  ["Compare before you call", "Every photographer lists Basic, Standard and Premium packages for each service. Compare what is included and what it costs, side by side."],
  ["Clear, upfront pricing", "Base price and offer price are shown on every package. You know the cost before you make contact."],
  ["Search by what matters", "Filter by service, city, phone model and price to find a photographer who fits your job and your budget."],
  ["See real work", "Portfolios in named galleries and approved customer reviews help you judge quality before you decide."],
  ["Talk directly", "Contact the photographer on WhatsApp or phone. No middleman, no commission added to your bill."],
  ["Reviewed profiles", "Every photographer profile is checked by our team before it goes live."],
];

const PHOTOGRAPHER_GAINS = [
  ["Turn your phone into income", "You already own the equipment. A profile here turns your skill into paid work without a studio, a lens kit or a big investment."],
  ["A new stream of customers", "People searching for a photographer in your city and service find you, instead of you chasing every lead on social media."],
  ["You set the prices", "Choose a base price and an offer price for every package. Raise, lower or run offers whenever you like."],
  ["Keep what you earn", "Customers pay you directly. We do not process payments or take a cut of your bookings."],
  ["Several services, one profile", "Offer wedding and event shoots, portraits, product photography, reels and more from a single profile."],
  ["Build a name that lasts", "Your portfolio, packages and reviews stay on your page and grow over time, working for you while you shoot."],
];

const INCOME_IDEAS = [
  ["Weekend work", "Take events, birthdays and portrait sessions around a job or studies."],
  ["Local businesses", "Product shoots and menu photos for shops, cafes and boutiques that need fresh images every month."],
  ["Repeat packages", "Offer Standard and Premium bundles so one customer becomes a regular client."],
  ["Content for creators", "Shoot short video and photo sets for creators and brands who publish every week."],
];

const PRINCIPLES = [
  ["Work with dignity", "We exist to create real, respected work for photographers. Customers and photographers agree the booking directly, with no online booking engine and no payment processing in between."],
  ["Transparent", "Packages and prices are visible to everyone. No hidden fees on the customer side."],
  ["Quality first", "Profiles are reviewed before they go live, and reviews are approved before they appear."],
  ["Fair to photographers", "We want photographers to keep their earnings and own their customer relationships."],
];

export default function AboutPage() {
  return (
    <>
      <section className="container-page max-w-3xl pt-10">
        <h1 className="heading-page">About PhonePhotography.in</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          A new venture built to give talented smartphone photographers a real way to earn. We create paid work for people who shoot well on the phone in their pocket, and we bring them customers who need great photos at fair prices.
        </p>
      </section>

      <section className="container-page max-w-3xl pt-12">
        <h2 className="heading-section">Why we started</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted">
          <p>
            Good photography used to mean a big camera, expensive lenses and a studio price. Today, a modern smartphone shoots photos and video that look professional when they are in skilled hands. The tool changed. The way people find and hire photographers did not.
          </p>
          <p>
            Across India, many young and talented people shoot beautiful photos on their phones. Most of them have no steady way to earn from it. They depend on friends, chance referrals and unpaid favours, while customers struggle to find someone good and trustworthy.
          </p>
          <p>
            PhonePhotography.in is a new venture built to change that. We create a form of work for phone photographers: a professional presence, clear packages, their own prices and a steady flow of customers. For customers, it means skilled photographers they can compare and hire with confidence.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {WHY.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-14">
        <h2 className="heading-section">What customers gain</h2>
        <p className="mt-2 max-w-2xl text-muted">Hiring a photographer should be as easy as comparing any other service.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMER_GAINS.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-14">
        <h2 className="heading-section">What photographers gain</h2>
        <p className="mt-2 max-w-2xl text-muted">A profile here is a low-cost way to be found by people who are ready to hire.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOGRAPHER_GAINS.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page max-w-3xl pt-14">
        <h2 className="heading-section">A new way to earn a living</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted">
          <p>
            Starting a photography business the old way needs money for gear, a studio and marketing. With a smartphone, the entry cost is close to zero. What you need is skill, an eye for a good frame and a way to reach customers. That last part is what we provide.
          </p>
          <p>
            Think of it as a job you build for yourself, with us behind you. Use it as a side income, a way to grow an existing business, or the start of a full-time career. Your earnings depend on your work, your prices and how many customers you serve. We do not promise a fixed income. We give you the visibility and the structure to earn one.
          </p>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {INCOME_IDEAS.map(([title, text]) => (
            <li key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page max-w-3xl pt-14">
        <h2 className="heading-section">How it works</h2>
        <ol className="mt-6 space-y-4">
          {[
            ["Photographers register", "Create a profile with your services, city and phone models, then list Basic, Standard and Premium packages with your own prices."],
            ["We review", "Our team checks each profile before it goes live, so customers see real, reviewed photographers."],
            ["Customers search", "Visitors filter by service, location, phone model and price, and compare packages."],
            ["They connect directly", "The customer contacts the photographer on WhatsApp or phone and agrees the booking between them."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-on-brand">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page pt-14">
        <h2 className="heading-section">What we stand for</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-4 pt-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Ready to get started?</h2>
            <p className="mt-1 text-muted">Hire a talented photographer for your next shoot, or join us and start earning from your phone camera.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/photographers" className="btn-outline">Find a Photographer</Link>
            <Link href="/photographer/register" className="btn-primary">Become a Photographer</Link>
          </div>
        </div>
      </section>
    </>
  );
}
