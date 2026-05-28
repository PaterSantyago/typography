import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";

if (process.env.CI === "true") {
  process.exit(0);
}

let hookPath;

try {
  hookPath = execFileSync(
    "git",
    ["rev-parse", "--git-path", "hooks/pre-commit"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  ).trim();
} catch {
  process.exit(0);
}

const hook = `#!/bin/sh

set -e

pnpm run ci
`;

mkdirSync(dirname(hookPath), { recursive: true });
writeFileSync(hookPath, hook, { mode: 0o755 });
chmodSync(hookPath, 0o755);
