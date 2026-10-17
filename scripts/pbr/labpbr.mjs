import { pathToFileURL } from "node:url";

/** LabPBR 1.3 RG is a DirectX tangent normal; Three expects OpenGL +Y. */
export function decodeNormal(red, green) {
  let x = red / 127.5 - 1;
  let y = -(green / 127.5 - 1);
  const lengthSquared = x * x + y * y;
  const z = Math.sqrt(Math.max(0, 1 - lengthSquared));
  if (lengthSquared > 1) {
    const length = Math.sqrt(lengthSquared);
    x /= length;
    y /= length;
  }
  return [x, y, z];
}

/** Three squares perceptual roughness inside its BRDF; do not square it twice. */
export function decodeSpecular(smoothness, f0OrMetal) {
  const metalness = f0OrMetal >= 230 ? 1 : 0;
  return {
    roughness: 1 - smoothness / 255,
    metalness,
    f0: metalness ? 0.04 : f0OrMetal / 255,
    // LabPBR's named-metal ID is preserved for provenance. Three's metallic
    // BRDF uses the existing block albedo, rather than the pack's complex IOR.
    metalId: metalness ? f0OrMetal : null,
  };
}

export function convertPixel(normal, specular) {
  const rgbNormal = decodeNormal(normal[0], normal[1]).map((n) =>
    Math.round((n * 0.5 + 0.5) * 255),
  );
  const surface = decodeSpecular(specular[0], specular[1]);
  const f0 = Math.round(surface.f0 * 255);
  return [
    ...rgbNormal,
    normal[2],
    Math.round(surface.roughness * 255),
    surface.metalness * 255,
    f0,
    f0,
    f0,
  ];
}

// The Python importer only does lossless PNG I/O. This converter is shared by
// the importer and the Node boundary tests, so there is one channel contract.
async function convertStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks);
  if (input.length % 8 !== 0)
    throw new Error("Expected packed normal+specular RGBA pixels");
  const output = Buffer.alloc((input.length / 8) * 9);
  for (
    let source = 0, target = 0;
    source < input.length;
    source += 8, target += 9
  ) {
    output.set(
      convertPixel(
        input.subarray(source, source + 4),
        input.subarray(source + 4, source + 8),
      ),
      target,
    );
  }
  process.stdout.write(output);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  convertStdin().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
