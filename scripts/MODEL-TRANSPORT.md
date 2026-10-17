# Model transport

Original GLBs stay in `public/xinera/hero` and `public/xinera/gallery`. After changing one, run `node scripts/model-transport.mjs --manifest` to update the content hashes and decoded sizes in `lib/model-assets.json`.

The production build's standalone preparation writes lossless Brotli files to `public/xinera/models` inside the runtime package. `next.config.js` serves them with `Content-Encoding: br`, the GLB content type, and immutable caching. The browser decodes the transport automatically; download progress uses the original byte length from the manifest. Development uses the original GLB. The build verifies both the source hash and the decompressed cached artifact before packaging; it fails if the manifest is stale. `MCXIN_MODEL_CACHE` can point to a reusable local build cache.

After changing gallery posters, run `node scripts/gallery-thumbnails.mjs`. The small scene selector uses these 320 × 200 thumbnails; the active scene keeps its full poster.
