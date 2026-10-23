import { ownedStates } from "./owned-state.js";
// Dedicated presentation objects: no existing Bone/Action object is acquired.
export function createOwnedRenderer(
  THREE,
  domain,
  { scene, geometry, material },
) {
  if (THREE.REVISION !== "186")
    throw Error("owned: renderer adapter requires r186");
  const state = ownedStates.get(domain);
  if (!state) throw Error("owned: invalid domain");
  state.live();
  if (!scene?.isScene || !geometry?.isBufferGeometry || !material?.isMaterial)
    throw Error("owned: scene/geometry/material required");
  if (
    material.transparent ||
    material.transmission > 0 ||
    !material.depthWrite ||
    !material.depthTest
  )
    throw Error("owned: opaque depth-writing material required");
  const indices = geometry.getAttribute("skinIndex"),
    weights = geometry.getAttribute("skinWeight");
  if (
    !indices ||
    !weights ||
    indices.itemSize !== 4 ||
    weights.itemSize !== 4 ||
    indices.count !== weights.count ||
    indices.count !== geometry.getAttribute("position")?.count
  )
    throw Error("owned: skin attributes required");
  for (let i = 0; i < indices.count; i++) {
    let total = 0;
    for (let j = 0; j < 4; j++) {
      const n = indices.getComponent(i, j),
        w = weights.getComponent(i, j);
      if (
        !Number.isInteger(n) ||
        n < 0 ||
        n >= state.n ||
        !Number.isFinite(w) ||
        w < 0
      )
        throw Error("owned: invalid skin attributes");
      total += w;
    }
    if (Math.abs(total - 1) > 1e-5)
      throw Error("owned: normalized skin weights required");
  }
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const size = Math.max(4, Math.ceil(Math.sqrt(state.n * 4) / 4) * 4),
    meshes = [];
  let applied = -1,
    dead = false,
    consumes = 0;
  class Palette extends THREE.Skeleton {
    constructor() {
      super([]);
      this.boneMatrices = new Float32Array(size * size * 4);
      this.boneTexture = new THREE.DataTexture(
        this.boneMatrices,
        size,
        size,
        THREE.RGBAFormat,
        THREE.FloatType,
      );
      this.boneTexture.needsUpdate = true;
    }
    update() {
      state.live();
      consumes++;
    }
    computeBoneTexture() {
      return this;
    }
  }
  for (let i = 0; i < state.r; i++) {
    const mesh = new THREE.SkinnedMesh(geometry, material),
      skeleton = new Palette();
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.boundingSphere = new THREE.Sphere(
      geometry.boundingSphere.center.clone(),
      Infinity,
    );
    const unsupported = () => {
      throw Error(
        "owned: presentation meshes do not support CPU skinning/raycast/bounds",
      );
    };
    mesh.raycast = unsupported;
    mesh.computeBoundingBox = unsupported;
    mesh.computeBoundingSphere = unsupported;
    mesh.getVertexPosition = unsupported;
    scene.add(mesh);
    meshes.push(mesh);
  }
  function live() {
    if (dead) throw Error("owned: renderer disposed");
    state.live();
  }
  function sync() {
    live();
    state.flush();
    if (applied === state.revision) return;
    const b = state.core.buffers();
    for (let i = 0; i < state.r; i++) {
      const mesh = meshes[i];
      mesh.matrix.fromArray(b.roots, i * 16);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.skeleton.boneMatrices.set(
        b.palette.subarray(i * state.n * 16, (i + 1) * state.n * 16),
      );
      mesh.skeleton.boneTexture.needsUpdate = true;
    }
    state.paletteBytes += state.r * state.n * 16 * 4;
    state.rootBytes += state.r * 16 * 8;
    applied = state.revision;
  }
  return Object.freeze({
    render(renderer, camera) {
      live();
      if (state.rendering) throw Error("owned: reentrant render");
      if (
        scene.parent ||
        scene.position.lengthSq() !== 0 ||
        scene.quaternion.x ||
        scene.quaternion.y ||
        scene.quaternion.z ||
        scene.quaternion.w !== 1 ||
        scene.scale.x !== 1 ||
        scene.scale.y !== 1 ||
        scene.scale.z !== 1 ||
        !scene.matrixAutoUpdate ||
        !scene.matrixWorldAutoUpdate
      )
        throw Error("owned: identity root scene required");
      sync();
      state.rendering = true;
      try {
        renderer.render(scene, camera);
      } finally {
        state.rendering = false;
      }
    },
    sync,
    onBeforeRender(callback) {
      live();
      if (typeof callback !== "function")
        throw Error("owned: callback required");
      for (const mesh of meshes) mesh.onBeforeRender = callback;
    },
    diagnostics() {
      live();
      return {
        presentationMeshes: meshes.length,
        ordinaryBones: meshes.reduce((n, m) => n + m.skeleton.bones.length, 0),
        paletteConsumes: consumes,
        paddedPaletteBytes: meshes.reduce(
          (n, m) => n + m.skeleton.boneMatrices.byteLength,
          0,
        ),
        appliedRevision: applied,
      };
    },
    dispose() {
      if (dead) return;
      if (state.rendering) throw Error("owned: disposal during render");
      for (const mesh of meshes) {
        scene.remove(mesh);
        mesh.skeleton.dispose();
      }
      dead = true;
    },
  });
}
