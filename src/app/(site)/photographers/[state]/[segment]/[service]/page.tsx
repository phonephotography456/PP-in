import { PhotographerListingPage, listingMetadata } from "@/components/PhotographerListingPage";

export const generateMetadata = ({ params, searchParams }: PageProps<"/photographers/[state]/[segment]/[service]">) => listingMetadata(params, searchParams);

export default function CityServicePage({ params, searchParams }: PageProps<"/photographers/[state]/[segment]/[service]">) {
  return <PhotographerListingPage params={params} searchParams={searchParams} />;
}
