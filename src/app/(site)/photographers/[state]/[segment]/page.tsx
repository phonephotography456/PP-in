import { PhotographerListingPage, listingMetadata } from "@/components/PhotographerListingPage";

// [segment] is a city slug (/karnataka/bengaluru) or a service slug (/karnataka/wedding).
export const generateMetadata = ({ params, searchParams }: PageProps<"/photographers/[state]/[segment]">) => listingMetadata(params, searchParams);

export default function StateSegmentPage({ params, searchParams }: PageProps<"/photographers/[state]/[segment]">) {
  return <PhotographerListingPage params={params} searchParams={searchParams} />;
}
