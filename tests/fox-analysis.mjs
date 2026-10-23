import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const archive = "bench/results/mac-20261023";
for (const [label, mutation, error] of [
  ["accept matching captured phases", () => {}, null],
  [
    "reject a different measured source",
    (m) => {
      m.hashes["fixtures/fox/replay.mjs"] = "changed";
    },
    "Different measured source hashes",
  ],
  [
    "reject a browser update",
    (m) => {
      m.browser = "changed";
    },
    "Different browser versions",
  ],
  [
    "reject different work",
    (m) => {
      m.options.samples++;
    },
    "Different samples",
  ],
  [
    "reject incomplete phases",
    (m) => {
      m.status = "failed";
    },
    "Incomplete phase",
  ],
])
  test(label, () => {
    const dir = mkdtempSync(join(tmpdir(), "fox-analysis-"));
    try {
      for (const phase of ["aa-before", "main", "aa-after"]) {
        mkdirSync(join(dir, phase));
        for (const file of ["manifest.json", "summary.json"])
          copyFileSync(`${archive}/${phase}/${file}`, join(dir, phase, file));
      }
      const path = join(dir, "aa-after", "manifest.json"),
        manifest = JSON.parse(readFileSync(path));
      mutation(manifest);
      writeFileSync(path, JSON.stringify(manifest));
      const result = spawnSync(
        process.execPath,
        ["bench/fox-compare.mjs", dir],
        { encoding: "utf8" },
      );
      if (error) {
        assert.notEqual(result.status, 0);
        assert(result.stderr.includes(error), result.stderr);
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(
          JSON.parse(readFileSync(join(dir, "comparison.json"))),
          JSON.parse(readFileSync(`${archive}/comparison.json`)),
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
