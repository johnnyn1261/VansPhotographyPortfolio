import { getPortfolioMetadata } from "@/lib/storage";
import GalleryClient from "./GalleryClient";
import { Suspense } from "react";
import type { Metadata } from "next";

export const revalidate = 3600; // Revalidate static data every hour at most, but API triggers revalidation on demand

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const album = typeof resolvedSearchParams.album === "string" ? resolvedSearchParams.album : "all";
  const metadata = await getPortfolioMetadata();

  const baseTitle = "Van-Nhan Nguyen | Photography Portfolio";
  
  if (album !== "all") {
    const category = metadata.categories.find(c => c.slug === album);
    if (category) {
      const albumName = category.name;
      const desc = category.description || `Curated gallery collection of ${albumName} photography by Van-Nhan Nguyen.`;
      return {
        title: `${albumName} | ${baseTitle}`,
        description: desc,
        openGraph: {
          title: `${albumName} | ${baseTitle}`,
          description: desc,
          type: "website"
        }
      };
    }
  }

  return {
    title: baseTitle
  };
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const album = typeof resolvedSearchParams.album === "string" ? resolvedSearchParams.album : "all";
  const metadata = await getPortfolioMetadata();

  return (
    <div className="w-full flex flex-col items-center">


      {/* Interactive Gallery Section */}
      <section className="w-full max-w-7xl px-6 py-12 flex-grow">
        <Suspense fallback={<div className="text-center py-20 text-text-light text-xs font-semibold tracking-widest uppercase">Loading Gallery...</div>}>
          <GalleryClient metadata={metadata} activeCategory={album} />
        </Suspense>
      </section>
    </div>
  );
}
