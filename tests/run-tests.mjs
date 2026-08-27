import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createAppServer, normalizeKeyword } from "../server.mjs";
import { ARCHETYPES, calculateResult } from "../public/scoring.js";

assert.deepEqual(normalizeKeyword(" 心情。 "), { original: "心情", canonical: "情绪" });
assert.deepEqual(normalizeKeyword("脑科学"), { original: "脑科学", canonical: "脑科学" });

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
const server = createAppServer({ dataFile, env: { ADMIN_TOKEN: "test-secret", PUBLIC_CLOUD_MIN_COUNT: "1" } });
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
  assert.deepEqual(accepted.normalized.map((item) => item.canonical), ["情绪", "脑科学", "人际关系"]);

  const cloud = await fetch(`${baseUrl}/api/v1/psychology-keywords/cloud?minCount=1`);
  assert.equal(cloud.status, 200);
  const payload = await cloud.json();
  assert.equal(payload.totalResponses, 1);
  assert.deepEqual(payload.words.map((item) => item.canonical).sort(), ["人际关系", "脑科学", "情绪"].sort());

  const fullAnswers = {
    college: "心理与认知科学学院", grade: "大二", identity: "major", courseTaken: "yes",
    recommendation: "5", recommendedCourse: "普通心理学", reasons: ["teacher", "science"], misconception: "brain",
    mascotKnown: "yes", mascotMatch: "yes", merchCount: "1-5", presenceRating: "4", primaryFocus: "research",
    futureVisibility: ["openlab", "workshop"], lifeCourses: ["evidence", "allow_emotion"], lifeUses: ["why_me", "communicate"],
    experimentJoined: "yes", experimentReasons: ["rigorous", "curious_result"], keywords: ["心情", "脑科学", "社交"],
    publicCloudConsent: true, privateText: "希望心院多办一些开放活动"
  };
  const responsePost = await fetch(`${baseUrl}/api/v1/responses`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: fullAnswers })
  });
  assert.equal(responsePost.status, 201);
  const responseAccepted = await responsePost.json();
  assert.equal(responseAccepted.storage, "local");
  assert.match(responseAccepted.resultCode, /^[AW][VL][EC]$/);

  const saved = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(saved.responses.length, 1);
  assert.equal(saved.responses[0].answers.privateText, undefined);
  assert.equal(saved.responses[0].message_to_xinyuan, "希望心院多办一些开放活动");

  const unauthorized = await fetch(`${baseUrl}/api/v1/stats/overview`);
  assert.equal(unauthorized.status, 401);
  const stats = await fetch(`${baseUrl}/api/v1/stats/overview`, { headers: { authorization: "Bearer test-secret" } });
  assert.equal(stats.status, 200);
  const statsPayload = await stats.json();
  assert.equal(statsPayload.totalResponses, 1);
  assert.equal(statsPayload.colleges["心理与认知科学学院"], 1);

  const csv = await fetch(`${baseUrl}/api/v1/stats/export.csv`, { headers: { authorization: "Bearer test-secret" } });
  assert.equal(csv.status, 200);
  const csvText = await csv.text();
  assert.match(csvText, /心理与认知科学学院/);
  assert.match(csvText, /希望心院多办一些开放活动/);

  const aiWithoutKey = await fetch(`${baseUrl}/api/v1/admin/ai-report`, { method: "POST", headers: { authorization: "Bearer test-secret" } });
  assert.equal(aiWithoutKey.status, 503);

  const expectedReport = { summary: "样本摘要", findings: ["发现"], dimensionInterpretation: ["维度"], recommendations: ["建议"], caveats: ["样本量有限"] };
  const mockOpenAiFetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.authorization, "Bearer test-openai-key");
    const request = JSON.parse(options.body);
    assert.equal(request.store, false);
    assert.equal(request.text.format.type, "json_schema");
    assert.doesNotMatch(request.input, /希望心院多办一些开放活动/);
    return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify(expectedReport) }] }] }) };
  };
  const aiServer = createAppServer({ dataFile, env: { ADMIN_TOKEN: "test-secret", OPENAI_API_KEY: "test-openai-key", OPENAI_MODEL: "test-model" }, fetchImpl: mockOpenAiFetch });
  await new Promise((resolve) => aiServer.listen(0, "127.0.0.1", resolve));
  try {
    const aiPort = aiServer.address().port;
    const ai = await fetch(`http://127.0.0.1:${aiPort}/api/v1/admin/ai-report`, { method: "POST", headers: { authorization: "Bearer test-secret" } });
    assert.equal(ai.status, 200);
    assert.deepEqual((await ai.json()).report, expectedReport);
  } finally {
    await new Promise((resolve) => aiServer.close(resolve));
  }

  const supabaseRows = [];
  const mockSupabaseFetch = async (url, options) => {
    assert.match(url, /^https:\/\/example\.supabase\.co\/rest\/v1\/survey_responses/);
    assert.equal(options.headers.apikey, "test-service-key");
    if (options.method === "POST") {
      const record = JSON.parse(options.body);
      assert.equal(record.answers.privateText, undefined);
      assert.equal(record.message_to_xinyuan, "希望心院多办一些开放活动");
      supabaseRows.push(record);
      return { ok: true, status: 201, text: async () => JSON.stringify([record]) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(supabaseRows) };
  };
  const supabaseServer = createAppServer({
    dataFile,
    env: { ADMIN_TOKEN: "test-secret", SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" },
    fetchImpl: mockSupabaseFetch
  });
  await new Promise((resolve) => supabaseServer.listen(0, "127.0.0.1", resolve));
  try {
    const supabasePort = supabaseServer.address().port;
    const supabaseBase = `http://127.0.0.1:${supabasePort}`;
    const health = await fetch(`${supabaseBase}/api/v1/health`);
    assert.equal((await health.json()).storage, "supabase");
    const submitted = await fetch(`${supabaseBase}/api/v1/responses`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: fullAnswers })
    });
    assert.equal(submitted.status, 201);
    const supabaseStats = await fetch(`${supabaseBase}/api/v1/stats/overview`, { headers: { authorization: "Bearer test-secret" } });
    assert.equal((await supabaseStats.json()).totalResponses, 1);
  } finally {
    await new Promise((resolve) => supabaseServer.close(resolve));
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}

console.log("All H5 scoring and API tests passed.");
