import { Suspense, type ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";

async function Guard({ role, loginPath, children }: { role: Role; loginPath: string; children: ReactNode }) {
  await requireRole(role, loginPath);
  return children;
}

export function RoleGuard(props: { role: Role; loginPath: string; children: ReactNode }) {
  return (
    <Suspense>
      <Guard {...props} />
    </Suspense>
  );
}
