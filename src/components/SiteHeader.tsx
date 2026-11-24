import Link from "next/link";
import { LoginMenu } from "./LoginMenu";
import { ServicesMenu } from "./ServicesMenu";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-sm text-white">P</span>
          <span>PhonePhotography</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
          <Link href="/" className="hover:text-brand">Home</Link>
          <ServicesMenu />
          <Link href="/locations" className="hover:text-brand">Locations</Link>
          <Link href="/earn" className="hover:text-brand">Earn</Link>
          <Link href="/contact-us" className="hover:text-brand">Contact</Link>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/photographer/register" className="btn-outline btn-sm">Become a Photographer</Link>
          <LoginMenu />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
