import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getFilterOptions } from "@/lib/public";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { services } = await getFilterOptions(); // cached, active services only
  return (
    <>
      <SiteHeader services={services} />
      <div className="flex-1">{children}</div>
      <SiteFooter services={services} />
    </>
  );
}
