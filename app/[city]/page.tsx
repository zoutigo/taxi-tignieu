import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityPage } from "@/components/cities/city-page";
import { cities, getCity } from "@/lib/data/cities";

// Besoin d'inclure la session utilisateur (auth) dans le layout : on force le SSR par requête.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return cities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = getCity(citySlug);
  if (!city) return {};
  const title = `Taxi ${city.name} | ${city.heroSubtitle}`;
  const description = city.description.slice(0, 155);
  const url = `/${city.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
    },
  };
}

export default async function CityPageRoute({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const city = getCity(citySlug);
  if (!city) return notFound();
  return <CityPage city={city} />;
}
