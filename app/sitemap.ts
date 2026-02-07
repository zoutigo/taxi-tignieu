import { MetadataRoute } from "next";
import { cities } from "@/lib/data/cities";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/services`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/tarifs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/reserver`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/avis`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/mentions-legales`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/politique-de-confidentialite`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Uniquement les villes gérées par CityPage
  const slugs = cities.map((c) => c.slug);

  const cityPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${baseUrl}/${slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
    lastModified: new Date(),
  }));

  return [...staticPages, ...cityPages];
}
