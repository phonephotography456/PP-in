import Link from "next/link";
import { Photo } from "@/components/Photo";

export const metadata = { title: "Earn with your phone camera" };

const STEPS = [
  ["Register", "Create your profile with your phone models, services and city. Verify your email."],
  ["Get approved", "Our team reviews your profile. Approved photographers go live."],
  ["List packages", "Add Basic, Standard and Premium packages for each service, with your own prices."],
  ["Get enquiries", "Customers contact you directly on WhatsApp or phone. You agree the booking yourself."],
];

const PERKS = [
  ["Your own prices", "Set a base price and an offer price for every package."],
  ["Direct enquiries", "No middleman. Customers call or WhatsApp you."],
  ["Your portfolio", "Show your best work in named galleries."],
  ["Reviews that build trust", "Approved customer reviews appear on your service pages."],
];

export default function EarnPage() {
  return (
    <>
      <section className="relative">
        <Photo seed="earn-hero" alt="Photographer shooting with a smartphone" className="h-[300px] sm:h-[380px]" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent">
          <div className="container-page flex h-full flex-col justify-end pb-10">
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">Earn with your phone camera.</h1>
            <p className="mt-3 max-w-xl text-white/90 sm:text-lg">List your photography services and get customers across India.</p>
            <div className="mt-5"><Link href="/photographer/register" className="btn bg-white text-ink hover:bg-surface">Become a Photographer</Link></div>
          </div>
        </div>
      </section>

      <section className="container-page pt-14">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page pt-14">
        <h2 className="text-2xl font-bold tracking-tight">Why list here</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PERKS.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold sm:text-2xl">Ready to get your first customer?</h2>
          <Link href="/photographer/register" className="btn-primary shrink-0">Become a Photographer</Link>
        </div>
      </section>
    </>
  );
}
