// Fixture conversion only: upload descriptors once, then discard JS animation state.
export function descriptorFromRig(rig) {
  rig.scene.updateMatrixWorld(true);
  const bones = rig.skeletons[0].bones,
    index = new Map(bones.map((b, i) => [b, i]));
  return {
    parents: bones.map((b) => index.get(b.parent) ?? -1),
    basePose: bones.map((b) => [
      ...b.position.toArray(),
      ...b.quaternion.toArray(),
      ...b.scale.toArray(),
    ]),
    inverseBind: rig.skeletons[0].boneInverses.map((m) => m.toArray()),
    roots: rig.meshes.map((m) => m.matrixWorld.toArray()),
    clips: rig.clips.map((c) => ({
      duration: c.duration,
      tracks: c.tracks.map((t) => {
        const match = /^bone(\d+)\.(position|quaternion|scale)$/.exec(t.name);
        if (!match) throw Error("Fixture track unsupported");
        return {
          node: Number(match[1]),
          property: match[2],
          times: Array.from(t.times),
          values: Array.from(t.values),
        };
      }),
    })),
  };
}
export function initialActions(d) {
  return d.roots.flatMap((_, rig) =>
    d.clips.map((_, clip) => ({
      type: "action",
      rig,
      clip,
      weight: clip ? 0.25 : 0.75,
    })),
  );
}
