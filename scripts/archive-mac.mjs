// Lossless frame archives: leave manifests/checks/summaries readable, gzip bulky run JSON.
import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const [source, destination] = process.argv.slice(2);
if (!source || !destination || existsSync(destination))
  throw Error("Usage: node scripts/archive-mac.mjs SOURCE NEW_DESTINATION");
const hashes = {};
function copy(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const a = join(src, e.name),
      b = join(dst, e.name);
    if (e.isDirectory()) copy(a, b);
    else {
      const raw = readFileSync(a),
        compress = /^(render|diagnostic)-.+\.json$/.test(e.name);
      if (compress) {
        const zipped = gzipSync(raw, { level: 9 });
        if (!gunzipSync(zipped).equals(raw))
          throw Error("Compression verification failed");
        writeFileSync(b + ".gz", zipped);
      } else copyFileSync(a, b);
      hashes[a.slice(source.length + 1)] = {
        sha256: createHash("sha256").update(raw).digest("hex"),
        archivedAs: b.slice(destination.length + 1) + (compress ? ".gz" : ""),
      };
    }
  }
}
copy(source, destination);
writeFileSync(
  join(destination, "archive-integrity.json"),
  JSON.stringify(
    {
      method:
        "Lossless gzip; SHA-256 of original file bytes; manifests retain original logical run filenames. Reports transparently read .json.gz.",
      files: hashes,
    },
    null,
    2,
  ) + "\n",
);
