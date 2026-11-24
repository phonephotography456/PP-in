import { PhotographerListingPage, listingMetadata } from "@/components/PhotographerListingPage";

export const generateMetadata = ({ params, searchParams }: PageProps<"/photographers/[state]">) => listingMetadata(params, searchParams);

export default function StatePage({ params, searchParams }: PageProps<"/photographers/[state]">) {
  return <PhotographerListingPage params={params} searchParams={searchParams} />;
}
