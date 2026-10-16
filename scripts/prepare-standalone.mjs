import { cp, mkdir, rm } from "node:fs/promises";
import { relative } from "node:path";
// Next's traced server intentionally omits these static asset directories.
await mkdir(".next/standalone/.next", { recursive: true });
await rm(".next/standalone/public", { recursive: true, force: true });
await cp("public", ".next/standalone/public", {
  recursive: true,
  filter(source) {
    const path = relative("public", source).replaceAll("\\", "/");
    // Source-volume metadata stays local; lights and materials are runtime assets.
    return (
      !/^xinera\/(?:gallery|hero)\/.*-(?:source|height)\.json$/.test(path) &&
      path !== "xinera/skins/manifest.json"
    );
  },
});
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
console.log("Standalone server and static assets are ready.");
