import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Register" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" portal="photographer" />
    </Suspense>
  );
}
