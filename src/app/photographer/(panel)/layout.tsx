import { PanelShell } from "@/components/PanelShell";
import { RoleGuard } from "@/components/RoleGuard";

const ITEMS = [
  { href: "/photographer/dashboard", label: "Dashboard" },
  { href: "/photographer/profile", label: "My Profile" },
  { href: "/photographer/services", label: "Services & Packages" },
  { href: "/photographer/portfolio", label: "My Portfolio" },
  { href: "/photographer/settings", label: "Account Settings" },
];

export default function PhotographerLayout({ children }: LayoutProps<"/photographer">) {
  return (
    <RoleGuard role="photographer" loginPath="/photographer/login">
      <PanelShell title="Photographer panel" items={ITEMS}>{children}</PanelShell>
    </RoleGuard>
  );
}
