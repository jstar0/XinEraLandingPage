import { redirect } from "next/navigation";
import { galleryPlace } from "@/features/gallery/content";

/** Preserve old building-view links after separating Gallery from the MC map. */
export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[] }>;
}) {
  const { place } = await searchParams;
  redirect(`/gallery?place=${galleryPlace(place ?? "courtyard")}`);
}
