#!/usr/bin/env bun
// ABOUT: One-time KV→D1 backfill for the anonymous-games counter (Phase 4 deployment step 1).
// ABOUT: Sets D1 to MAX(kv_value, d1_value) for idempotency, then deletes the KV key.

import { execSync } from "node:child_process";

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function tryRun(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

// 1. Read the current KV counter value (key may not exist if counter was never set).
const kvRaw = tryRun("bunx wrangler kv key get --binding=KV stats:anonymous-games");
const kvValue = kvRaw !== null && kvRaw !== "" ? parseInt(kvRaw, 10) : 0;
console.log(`KV counter: ${kvValue}${kvRaw === null ? " (key not found — treating as 0)" : ""}`);

// 2. Read the current D1 counter value.
const d1Raw = run(
  `bunx wrangler d1 execute hnefatafl-db --remote --json --command "SELECT total_anonymous_games FROM site_stats WHERE id = 1"`,
);
const d1Result = JSON.parse(d1Raw) as Array<{
  results: Array<{ total_anonymous_games: number }>;
}>;
const d1Value = d1Result[0]?.results[0]?.total_anonymous_games ?? 0;
console.log(`D1 counter: ${d1Value}`);

// 3. Set D1 to MAX(kv, d1) — idempotent; re-running after a partial failure is safe.
const target = Math.max(kvValue, d1Value);
console.log(`Target: ${target}`);

if (target !== d1Value) {
  run(
    `bunx wrangler d1 execute hnefatafl-db --remote --command "UPDATE site_stats SET total_anonymous_games = ${target} WHERE id = 1"`,
  );
  console.log(`D1 updated to ${target}.`);
} else {
  console.log("D1 already at target value — skipping update.");
}

// 4. Delete the KV key. New Worker reads D1; old key is dead weight.
if (kvRaw !== null) {
  run("bunx wrangler kv key delete --binding=KV stats:anonymous-games");
  console.log("KV key deleted.");
} else {
  console.log("KV key did not exist — nothing to delete.");
}

console.log("Backfill complete.");
