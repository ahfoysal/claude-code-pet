import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://claudecodepet.vercel.app",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
