import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import { browserPath } from "./browser-path.mjs";
const out = process.argv[2] || "work/gpu";
mkdirSync(out, { recursive: true });
function command(file, args) {
  try {
    return {
      available: true,
      output: execFileSync(file, args, {
        encoding: "utf8",
        timeout: 15000,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (e) {
    return { available: false, reason: e.code || `exit ${e.status}` };
  }
}
const info = {
  date: new Date().toISOString(),
  platform: os.platform(),
  release: os.release(),
  arch: os.arch(),
  cpuModel: os.cpus()[0]?.model,
  logicalCpus: os.cpus().length,
  totalMemory: os.totalmem(),
  browserPath: browserPath(),
  node: process.version,
};
if (process.platform === "darwin") {
  info.macos = command("sw_vers", []);
  // Allowlist model/core/memory fields; never publish serial, UUID, UDID or display serial.
  const raw = command("system_profiler", [
    "-json",
    "SPHardwareDataType",
    "SPDisplaysDataType",
  ]);
  if (raw.available) {
    const s = JSON.parse(raw.output),
      h = s.SPHardwareDataType[0];
    info.hardware = Object.fromEntries(
      [
        "machine_name",
        "machine_model",
        "chip_type",
        "number_processors",
        "physical_memory",
      ]
        .filter((k) => k in h)
        .map((k) => [k, h[k]]),
    );
    info.graphics = s.SPDisplaysDataType.map((g) => ({
      model: g.sppci_model,
      cores: g.sppci_cores,
      metal: g.spdisplays_mtlgpufamilysupport,
      displays: (g.spdisplays_ndrvs || []).map((d) =>
        Object.fromEntries(
          [
            "_name",
            "spdisplays_resolution",
            "_spdisplays_pixels",
            "_spdisplays_resolution",
            "spdisplays_pixelresolution",
            "spdisplays_refresh_rate",
            "spdisplays_main",
            "spdisplays_online",
            "spdisplays_connection_type",
          ]
            .filter((k) => k in d)
            .map((k) => [k, d[k]]),
        ),
      ),
    }));
  } else info.hardware = raw;
  info.power = command("pmset", ["-g", "batt"]);
  info.powerSettings = command("pmset", ["-g", "custom"]);
  info.thermal = command("pmset", ["-g", "therm"]);
  info.driver =
    "Apple GPU driver ships with the recorded macOS build; no separate driver version queried.";
} else {
  info.nvidia = command("nvidia-smi", [
    "--query-gpu=name,driver_version,pci.bus_id,memory.total,temperature.gpu,pstate",
    "--format=csv",
  ]);
  info.pci = command("lspci", ["-nnk"]);
  info.glx = command("glxinfo", ["-B"]);
  info.vulkan = command("vulkaninfo", ["--summary"]);
  for (const [key, path] of [
    ["cpuQuota", "/sys/fs/cgroup/cpu.max"],
    ["memoryLimit", "/sys/fs/cgroup/memory.max"],
  ])
    try {
      info[key] = readFileSync(path, "utf8").trim();
    } catch {
      info[key] = "unavailable";
    }
}
writeFileSync(`${out}/runner.json`, JSON.stringify(info, null, 2) + "\n");
console.log(
  "Recorded allowlisted host observations; verify actual WebGL backend separately.",
);
