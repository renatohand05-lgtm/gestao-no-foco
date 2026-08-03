#!/usr/bin/env node
/** Remove temporary doctor wrapper acceptance of 19/20 — use real expo-doctor. */
import { spawnSync } from "node:child_process";

const r = spawnSync("npm", ["run", "doctor", "-w", "@gof/mobile"], {
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
