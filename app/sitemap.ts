import { MetadataRoute } from "next";
import { cities } from "@/lib/data/cities";

const baseUrl = (() => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!envUrl) {
    throw new Error("Sitemap: NEXT_PUBLIC_APP_URL doit être défini pour générer des URLs valides.");
  }
  return envUrl.replace(/\/+$/, "");
})();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0, lastModified: now },
    { url: `${baseUrl}/services`, changeFrequency: "weekly", priority: 0.8, lastModified: now },
    { url: `${baseUrl}/tarifs`, changeFrequency: "weekly", priority: 0.8, lastModified: now },
    { url: `${baseUrl}/reserver`, changeFrequency: "weekly", priority: 0.8, lastModified: now },
    { url: `${baseUrl}/avis`, changeFrequency: "weekly", priority: 0.6, lastModified: now },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${baseUrl}/a-propos`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
    {
      url: `${baseUrl}/mentions-legales`,
      changeFrequency: "monthly",
      priority: 0.4,
      lastModified: now,
    },
    {
      url: `${baseUrl}/politique-de-confidentialite`,
      changeFrequency: "monthly",
      priority: 0.4,
      lastModified: now,
    },
  ];

  const cityPages: MetadataRoute.Sitemap = [...new Set(cities.map((c) => c.slug))].map((slug) => ({
    url: `${baseUrl}/${slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified: now,
  }));

  return [...staticPages, ...cityPages];
}
