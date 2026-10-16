import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Gallery } from "@/features/gallery/gallery";
import { galleryPlace } from "@/features/gallery/content";
import "./gallery.css";

export const metadata = {
  title: "世界巡游",
  description:
    "从克莱尔一带到西奥格勒，先看看心纪元故事里的地方。八处世界场景，沿途巡游，也可以停下慢慢看。",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[] }>;
}) {
  const { place } = await searchParams;
  return (
    <>
      <Header />
      <main id="main">
        <Gallery initialPlace={galleryPlace(place)} />
      </main>
      <Footer />
    </>
  );
}
