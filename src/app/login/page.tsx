import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Admin log in" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" portal="admin" />
    </Suspense>
  );
}
