// Finite, fail-closed fixture conversion for the pinned Fox; not a general glTF importer.
export function descriptorFromFox(THREE, model, clips, roots) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  if (meshes.length !== 1 || !meshes[0].isSkinnedMesh)
    throw Error("Fox fixture requires exactly one SkinnedMesh");
  const mesh = meshes[0],
    bones = mesh.skeleton.bones,
    index = new Map(bones.map((b, i) => [b, i]));
  const identity = (m) =>
    m.elements.every((x, i) => Math.abs(x - (i % 5 === 0 ? 1 : 0)) < 1e-10);
  if (
    !identity(mesh.matrixWorld) ||
    !identity(mesh.bindMatrix) ||
    mesh.bindMode !== "attached"
  )
    throw Error("Unsupported Fox mesh/bind transform");
  if (
    mesh.morphTargetInfluences?.length ||
    Array.isArray(mesh.material) ||
    mesh.material.transparent ||
    mesh.material.transmission > 0
  )
    throw Error("Unsupported Fox morph/multiple/transparent material");
  for (const [i, b] of bones.entries()) {
    if (index.has(b.parent)) {
      if (index.get(b.parent) >= i) throw Error("Unsupported joint ordering");
    } else if (!identity(b.parent.matrixWorld))
      throw Error("Unsupported non-joint parent transform");
  }
  const descriptor = {
    parents: bones.map((b) => index.get(b.parent) ?? -1),
    basePose: bones.map((b) => [
      ...b.position.toArray(),
      ...b.quaternion.toArray(),
      ...b.scale.toArray(),
    ]),
    inverseBind: mesh.skeleton.boneInverses.map((m) => m.toArray()),
    roots,
    clips: clips.map((c) => {
      if (c.blendMode !== THREE.NormalAnimationBlendMode)
        throw Error("Unsupported additive animation");
      return {
        duration: c.duration,
        tracks: c.tracks.map((t) => {
          const p = THREE.PropertyBinding.parseTrackName(t.name),
            b = THREE.PropertyBinding.findNode(model, p.nodeName),
            node = index.get(b);
          if (
            node === undefined ||
            p.objectName ||
            p.propertyIndex !== undefined ||
            !["position", "quaternion", "scale"].includes(p.propertyName) ||
            t.getInterpolation() !== THREE.InterpolateLinear ||
            t.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline
          )
            throw Error(`Unsupported Fox track: ${t.name}`);
          return {
            node,
            property: p.propertyName,
            times: Array.from(t.times),
            values: Array.from(t.values),
          };
        }),
      };
    }),
  };
  return { descriptor, mesh, bones };
}
