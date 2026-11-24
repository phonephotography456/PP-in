import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Admin log in", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" portal="admin" />
    </Suspense>
  );
}
