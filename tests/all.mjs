/* Runs every suite in its own process and prints one total. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUITES = [
  ["lessons and tracks",        "run.mjs",       { SUITE: "learner" }],
  ["teacher console",           "run.mjs",       { SUITE: "admin" }],
  ["teacher console signed out","run.mjs",       { SUITE: "admin", NO_USER: "1" }],
  ["sign-up wizard",            "run.mjs",       { SUITE: "join",  NO_USER: "1" }],
  ["files agree with each other","run.mjs",      { SUITE: "repo" }],
  ["class, hand-ins and marking","classroom.mjs", {}]
];

const NOISE = /Not implemented|MODULE_TYPELESS|Reparsing|eliminate this|trace-warnings|^\s+at /;
let total = 0, failed = 0, broken = [];

for (const [label, file, env] of SUITES) {
  const r = spawnSync(process.execPath, [path.join(HERE, file)],
    { cwd: HERE, env: { ...process.env, ...env }, encoding: "utf8" });
  const out = ((r.stdout || "") + (r.stderr || "")).split("\n").filter(l => !NOISE.test(l));
  const line = out.find(l => /\d+ passed, \d+ failed/.test(l)) || "";
  const m = /(\d+) passed, (\d+) failed/.exec(line);
  const p = m ? +m[1] : 0, f = m ? +m[2] : 0;
  total += p; failed += f;
  if (!m || f || r.status !== 0) {
    broken.push(label);
    out.filter(l => /FAIL|Error/.test(l)).forEach(l => console.log("  " + label + ": " + l.trim()));
    if (!m) console.log("  " + label + ": suite did not finish\n" + out.slice(-12).join("\n"));
  }
  console.log((f ? "✗" : "✓") + " " + label.padEnd(30) + p + " passed" + (f ? ", " + f + " FAILED" : ""));
}

console.log("\n" + (failed || broken.length ? "SOMETHING IS BROKEN" : "ALL GOOD")
  + " — " + total + " checks passed" + (failed ? ", " + failed + " failed" : ""));
if (failed || broken.length) process.exitCode = 1;
