import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { entries } from "@/features/journal/content";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/gallery",
    "/map",
    "/journal",
    ...entries.map((e) => `/journal/${e.slug}`),
  ].map((path) => ({ url: site.url + path }));
}
