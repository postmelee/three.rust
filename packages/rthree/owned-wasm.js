const urls = new Map(),
  sources = new WeakMap();
async function instance(options) {
  const key =
      options.wasmBytes ??
      String(options.wasmURL ?? new URL("./scene_core.wasm", import.meta.url)),
    cache = typeof key === "string" ? urls : sources;
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        const bytes =
          options.wasmBytes ??
          (await (async () => {
            const r = await fetch(key);
            if (!r.ok) throw Error(`owned Wasm HTTP ${r.status}`);
            return r.arrayBuffer();
          })());
        return (await WebAssembly.instantiate(bytes, {})).instance.exports;
      })(),
    );
  try {
    return await cache.get(key);
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}
// Internal constructor accepts an instance for memory-growth/native ABI tests.
export function wasmCore(api, encoded) {
  const { data, n, r, c } = encoded,
    id = api.owned_new(data.length);
  if (!id) throw Error("owned: allocation failed");
  try {
    new Float64Array(api.memory.buffer, api.owned_input(id), data.length).set(
      data,
    );
    if (!api.owned_init(id)) throw Error("owned: native descriptor rejected");
  } catch (error) {
    api.owned_free(id);
    throw error;
  }
  const command = api.owned_command_ptr(id),
    lengths = [r * n * 10, r * n * 16, r * 16, r * c * 5, r * n * 16],
    names = ["pose", "world", "roots", "actions", "palette"],
    ptrs = names.map((_, i) => api.owned_buffer(id, i));
  let buffer,
    views,
    calls = 0;
  return {
    commands(d) {
      new Float64Array(api.memory.buffer, command, d.length).set(d);
      if (!api.owned_commands(id, d.length / 20))
        throw Error("owned: native command rejected");
      calls++;
    },
    step(dt) {
      if (!api.owned_step(id, dt)) throw Error("owned: native step rejected");
      calls++;
    },
    buffers() {
      if (buffer !== api.memory.buffer) {
        buffer = api.memory.buffer;
        views = Object.fromEntries(
          names.map((key, i) => [
            key,
            new (i === 4 ? Float32Array : Float64Array)(
              buffer,
              ptrs[i],
              lengths[i],
            ),
          ]),
        );
      }
      return views;
    },
    get steps() {
      return api.owned_steps(id);
    },
    get wasmCalls() {
      return calls;
    },
    get memoryBytes() {
      return api.memory.buffer.byteLength;
    },
    dispose() {
      api.owned_free(id);
      views = undefined;
      buffer = undefined;
    },
  };
}
export async function createWasmOwned(encoded, options) {
  return wasmCore(await instance(options), encoded);
}
