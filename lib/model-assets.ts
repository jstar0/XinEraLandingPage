import manifest from "./model-assets.json";
import type { GalleryPlace } from "@/features/gallery/content";

export function modelAsset(key: keyof typeof manifest) {
  const asset = manifest[key];
  return {
    url:
      process.env.NODE_ENV === "production"
        ? asset.url
        : `${asset.source}?v=${asset.sha256.slice(0, 16)}`,
    bytes: asset.bytes,
  };
}

export function galleryModelAsset(place: GalleryPlace) {
  const name = place === "courtyard" || place === "hall" ? "cathedral" : place;
  return modelAsset(`gallery/${name}`);
}
