import type { Metadata } from "next";
import type { ReactNode } from "react";

// Customer registration, login and password reset: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ReviewerAreaLayout({ children }: { children: ReactNode }) {
  return children;
}
