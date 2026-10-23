import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const manifest = JSON.parse(readFileSync("fixtures/fox/provenance.json"));
for (const f of manifest.files) {
  mkdirSync(f.path.slice(0, f.path.lastIndexOf("/")), { recursive: true });
  if (!existsSync(f.path))
    execFileSync("curl", [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      f.url,
      "-o",
      f.path,
    ]);
  if (
    createHash("sha256").update(readFileSync(f.path)).digest("hex") !== f.sha256
  )
    throw Error(`Fox checksum mismatch: ${f.path}`);
}
console.log("Pinned Fox asset and attribution verified");
