import { PanelShell } from "@/components/PanelShell";
import { RoleGuard } from "@/components/RoleGuard";

// Exactly seven main pages. Account actions live outside the nav.
const ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/photographers", label: "Photographers" },
  { href: "/admin/master-data", label: "Master Data" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/homepage", label: "Homepage" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RoleGuard role="admin" loginPath="/login">
      <PanelShell title="Admin panel" items={ITEMS}>{children}</PanelShell>
    </RoleGuard>
  );
}
