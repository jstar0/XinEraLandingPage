import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
for (const name of [
  "volcano",
  "courtyard",
  "hall",
  "claire",
  "west",
  "asa",
  "royal",
  "north",
]) {
  const output = await sharp(`public/xinera/gallery/${name}-poster.webp`)
    .resize(320, 200, { fit: "cover" })
    .webp({ quality: 72, effort: 6 })
    .toFile(`public/xinera/gallery/${name}-thumb.webp`);
  console.log(`${name}: ${output.size} bytes`);
}
