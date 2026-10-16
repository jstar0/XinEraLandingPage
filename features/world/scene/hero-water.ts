import * as THREE from "three";

/** Source water volumes remain intact; only their presentation material changes. */
export function prepareHeroWater(root: THREE.Object3D) {
  const clock = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    color: "#8ac4d5",
    roughness: 0.24,
    metalness: 0.08,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  material.name = "falling-water";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = clock;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 flowPosition; varying vec3 flowNormal;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        flowPosition=(modelMatrix*vec4(transformed,1.)).xyz;
        flowNormal=normalize(mat3(modelMatrix)*objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float waterTime; varying vec3 flowPosition; varying vec3 flowNormal;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float falling=1.-smoothstep(.35,.8,abs(flowNormal.y));
        float strands=pow(.5+.5*sin((flowPosition.x+flowPosition.z)*105.+sin(flowPosition.y*3.+waterTime*2.)),10.);
        float ripples=pow(.5+.5*sin(flowPosition.y*48.+waterTime*5.+sin(flowPosition.x*25.)*.7),18.);
        float surface=pow(.5+.5*sin(flowPosition.x*35.+flowPosition.z*29.-waterTime*1.5),16.);
        float foam=mix(surface*.16,strands*.18+ripples*.25,falling);
        float edge=pow(1.-abs(dot(normalize(cameraPosition-flowPosition),normalize(flowNormal))),3.);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.85,.95,1.),foam);
        diffuseColor.a=.12+falling*.07+foam*.3+edge*.16;`,
      );
  };
  material.customProgramCacheKey = () => "xinera-source-water-flow-1";
  const retained = new Set<THREE.Texture>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.name === "water") return;
    for (const item of Array.isArray(node.material)
      ? node.material
      : [node.material])
      for (const value of Object.values(item))
        if (value instanceof THREE.Texture) retained.add(value);
  });
  const unused = new Set<THREE.Texture>();
  let count = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.name !== "water") return;
    const previous = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const old of previous) {
      for (const value of Object.values(old))
        if (value instanceof THREE.Texture && !retained.has(value))
          unused.add(value);
      old.dispose();
    }
    // A single material covers all groups; positions/indices are not edited.
    node.material = material;
    node.castShadow = false;
    node.receiveShadow = true;
    node.renderOrder = 1;
    count++;
  });
  unused.forEach((texture) => texture.dispose());
  if (!count) material.dispose();
  return {
    update(time: number) {
      clock.value = time;
    },
    count,
  };
}
