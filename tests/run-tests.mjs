import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createAppServer, normalizeKeyword } from "../server.mjs";
import { ARCHETYPES, calculateResult } from "../public/scoring.js";

assert.deepEqual(normalizeKeyword(" 心情。 "), { original: "心情", canonical: "情绪" });
assert.deepEqual(normalizeKeyword("脑科学"), { original: "脑科学", canonical: "大脑与神经" });

const base = {
  courseTaken: "yes",
  misconception: "brain",
  lifeCourses: ["evidence", "allow_emotion", "no_diagnose"],
  lifeUses: ["why_me", "communicate", "habit_change"],
  experimentJoined: "yes",
  experimentReasons: ["rigorous", "curious_result"],
  futureVisibility: ["openlab", "workshop"]
};

for (const affinity of ["A", "W"]) {
  for (const presence of ["V", "L"]) {
    for (const orientation of ["E", "C"]) {
      const state = {
        ...base,
        recommendation: affinity === "A" ? "5" : "1",
        reasons: affinity === "A" ? ["teacher", "challenge_gain"] : ["difficulty_high", "workload_bad"],
        mascotKnown: presence === "V" ? "yes" : "no",
        mascotMatch: presence === "V" ? "yes" : undefined,
        merchCount: presence === "V" ? "11+" : undefined,
        presenceRating: presence === "V" ? "5" : "1",
        primaryFocus: orientation === "E" ? "research" : "service"
      };
      const result = calculateResult(state);
      const expected = `${affinity}${presence}${orientation}`;
      assert.equal(result.code, expected, `expected ${expected}, got ${result.code}`);
      assert.equal(result.archetype, ARCHETYPES[expected]);
      assert.ok(result.cp >= 0 && result.cp <= 100);
    }
  }
}

const temp = await mkdtemp(join(tmpdir(), "xinyuan-h5-"));
const dataFile = join(temp, "keywords.json");
const server = createAppServer({ dataFile });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

try {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /你心中的心院/);

  const post = await fetch(`${baseUrl}/api/v1/psychology-keywords`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ words: ["心情", "脑科学", "社交"], publicCloudConsent: true })
  });
  assert.equal(post.status, 200);
  const accepted = await post.json();
  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.normalized.map((item) => item.canonical), ["情绪", "大脑与神经", "人际关系"]);

  const cloud = await fetch(`${baseUrl}/api/v1/psychology-keywords/cloud?minCount=1`);
  assert.equal(cloud.status, 200);
  const payload = await cloud.json();
  assert.equal(payload.totalResponses, 1);
  assert.deepEqual(payload.words.map((item) => item.canonical).sort(), ["人际关系", "大脑与神经", "情绪"].sort());
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}

console.log("All H5 scoring and API tests passed.");
