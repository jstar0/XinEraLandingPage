import * as THREE from "three";

export type BlockKind =
  | "stone"
  | "wood"
  | "leaves"
  | "glass"
  | "metal"
  | "light"
  | "water"
  | "other";
export type BlockMaterialDefinitions = {
  tiles: { tile: number; texture: string; kind: BlockKind }[];
};
/** Decoded, linear-data maps; ORM uses Three's R=AO, G=roughness, B=metalness. */
export type BlockPbrTextures = {
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  /** Linear dielectric reflectance at normal incidence, stored in red. */
  f0Map?: THREE.Texture;
  normalScale?: number;
};
export type BlockPbrSet = ReadonlyMap<string, BlockPbrTextures>;

export function blockTextureKey(texture: string) {
  return texture.replace(/^minecraft:/, "").replace(/^block\//, "");
}

/** F0 is independent of metalness; leaf back lighting is scattered light, never emission. */
function configureBlockShader(
  material: THREE.MeshStandardMaterial,
  thinLeaf: boolean,
  f0Map?: THREE.Texture,
) {
  if (!thinLeaf && !f0Map) return;
  material.userData.thinLeafScattering = thinLeaf;
  material.onBeforeCompile = (shader) => {
    if (f0Map && material.map) {
      f0Map.updateMatrix();
      shader.uniforms.blockF0Map = { value: f0Map };
      shader.uniforms.blockF0Transform = { value: f0Map.matrix };
      shader.fragmentShader = `uniform sampler2D blockF0Map;\nuniform mat3 blockF0Transform;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_physical_fragment>",
        THREE.ShaderChunk.lights_physical_fragment.replace(
          "material.specularColor = vec3( 0.04 );",
          "material.specularColor = texture2D(blockF0Map, (blockF0Transform * vec3(vMapUv, 1.0)).xy).rrr;",
        ),
      );
    }
    if (thinLeaf) {
      const direct =
        "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
      const lighting = THREE.ShaderChunk.lights_fragment_begin.replaceAll(
        direct,
        `${direct}
      reflectedLight.directDiffuse += material.diffuseColor * directLight.color
        * (0.16 * RECIPROCAL_PI * pow(max(dot(-geometryNormal, directLight.direction), 0.0), 0.7));`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_begin>",
        lighting,
      );
    }
  };
  material.customProgramCacheKey = () =>
    `xinera-block-v2-leaf${Number(thinLeaf)}-f0${Number(!!f0Map && !!material.map)}`;
}

function surfaceResponse(kind: BlockKind, texture: string) {
  if (kind === "water")
    return { roughness: 0.12, metalness: 0, environment: 1.1 };
  if (kind === "glass")
    return { roughness: 0.16, metalness: 0, environment: 1 };
  if (kind === "metal")
    return { roughness: 0.4, metalness: 0.85, environment: 1 };
  if (kind === "wood")
    return { roughness: 0.78, metalness: 0, environment: 0.65 };
  if (kind === "leaves")
    return { roughness: 0.83, metalness: 0, environment: 0.45 };
  if (kind === "stone") {
    const polished = /polished|smooth|quartz/.test(texture);
    return {
      roughness: polished ? 0.55 : 0.79,
      metalness: 0,
      environment: 0.85,
    };
  }
  return { roughness: 0.88, metalness: 0, environment: 0.65 };
}

/**
 * A material group cannot individually opt out of a Three shadow pass. Separate
 * water/glass indices while sharing the original vertex attributes. This is
 * solely a material partition; missing source geometry needs its own export.
 */
export function separateTransparentGroups(root: THREE.Object3D) {
  const nodes: THREE.Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) nodes.push(node);
  });
  for (const node of nodes) {
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    const category = (material: THREE.Material) =>
      material.userData.blockKind === "water"
        ? "water"
        : material.transparent || material.userData.blockKind === "glass"
          ? "glass"
          : "opaque";
    const categories = new Set(materials.map(category));
    if (categories.size === 1) {
      const only = [...categories][0];
      node.castShadow = node.receiveShadow = only === "opaque";
      if (only === "water") node.name = "water";
      continue;
    }
    const source = node.geometry;
    const sourceIndex = source.getIndex();
    const groups = source.groups.length
      ? source.groups
      : [
          {
            start: 0,
            count: sourceIndex?.count ?? source.getAttribute("position").count,
            materialIndex: 0,
          },
        ];
    const partitions = new Map<
      string,
      {
        indices: number[];
        materials: THREE.Material[];
        groups: { start: number; count: number; materialIndex: number }[];
      }
    >();
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0];
      const key = category(material);
      let part = partitions.get(key);
      if (!part) {
        part = { indices: [], materials: [], groups: [] };
        partitions.set(key, part);
      }
      const start = Math.max(group.start, source.drawRange.start);
      const end = Math.min(
        group.start + group.count,
        source.drawRange.start + source.drawRange.count,
      );
      if (end <= start) continue;
      part.groups.push({
        start: part.indices.length,
        count: end - start,
        materialIndex: part.materials.length,
      });
      part.materials.push(material);
      for (let i = start; i < end; i++)
        part.indices.push(sourceIndex ? sourceIndex.getX(i) : i);
    }
    let first = true;
    for (const [key, part] of partitions) {
      if (!part.indices.length) continue;
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(source.attributes))
        geometry.setAttribute(name, attribute);
      geometry.setIndex(part.indices);
      geometry.groups = part.groups;
      geometry.boundingBox = source.boundingBox?.clone() ?? null;
      geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
      const mesh = first ? node : new THREE.Mesh();
      mesh.geometry = geometry;
      mesh.material = part.materials;
      mesh.castShadow = mesh.receiveShadow = key === "opaque";
      if (key === "water") mesh.name = "water";
      if (!first) node.add(mesh);
      first = false;
    }
    source.dispose();
  }
}

/** Shared physical response for every exported scene; existing emission masks survive. */
export function finishBlockMaterials(
  root: THREE.Object3D,
  definitions: BlockMaterialDefinitions,
  pbr?: BlockPbrSet,
) {
  const tiles = new Map(definitions.tiles.map((tile) => [tile.tile, tile]));
  const seen = new Set<THREE.Material>();
  const stats = {
    materials: 0,
    pbrMaterials: 0,
    cutoutMaterials: 0,
    waterMeshes: 0,
  };
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      if (
        !(material instanceof THREE.MeshStandardMaterial) ||
        seen.has(material)
      )
        continue;
      seen.add(material);
      // Supplementary fluid exports have their own atlas. Their tile numbers
      // must never be interpreted through the surrounding building's atlas.
      const sourceWater =
        node.name === "water" || node.userData.blockKind === "water";
      const definition = sourceWater
        ? undefined
        : tiles.get(material.userData.blockTextureTile);
      const kind = sourceWater ? "water" : (definition?.kind ?? "other");
      const texture = blockTextureKey(definition?.texture ?? "");
      const response = surfaceResponse(kind, texture);
      material.userData.blockKind = kind;
      material.userData.blockTexture = texture;
      material.roughness = response.roughness;
      material.metalness = response.metalness;
      material.envMapIntensity = response.environment;
      const maps = pbr?.get(texture);
      if (maps && kind !== "water") {
        if (maps.normalMap) {
          material.normalMap = maps.normalMap;
          material.normalScale.setScalar(maps.normalScale ?? 0.65);
          material.bumpMap = null;
        }
        if (maps.roughnessMap) {
          material.roughnessMap = maps.roughnessMap;
          material.roughness = 1;
        }
        if (maps.metalnessMap) {
          material.metalnessMap = maps.metalnessMap;
          material.metalness = 1;
        }
        if (maps.aoMap) {
          material.aoMap = maps.aoMap;
          material.aoMapIntensity = 0.45;
        }
        stats.pbrMaterials++;
      }
      if (kind === "leaves") {
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        // Dense foliage is already minified through per-tile mipmaps. Three's
        // derivative-based alpha-to-coverage can thin even opaque texels when
        // many tiny holes overlap, producing a stippled canopy. Keep the real
        // cutout in beauty, shadow and AO passes; SMAA handles its screen edge.
        material.alphaTest = 0.35;
        material.alphaToCoverage = false;
        material.side = THREE.DoubleSide;
        material.shadowSide = THREE.DoubleSide;
        stats.cutoutMaterials++;
      }
      if (kind === "glass" || kind === "water") {
        material.depthWrite = false;
        material.userData.excludeFromAO = true;
      }
      configureBlockShader(material, kind === "leaves", maps?.f0Map);
      material.needsUpdate = true;
      stats.materials++;
    }
  });
  separateTransparentGroups(root);
  root.traverse((node) => {
    if (node instanceof THREE.Mesh && node.name === "water")
      stats.waterMeshes++;
  });
  return stats;
}
