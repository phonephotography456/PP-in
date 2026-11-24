import type { Metadata } from "next";
import type { ReactNode } from "react";

// Registration, login, password reset and the photographer panel: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PhotographerAreaLayout({ children }: { children: ReactNode }) {
  return children;
}
