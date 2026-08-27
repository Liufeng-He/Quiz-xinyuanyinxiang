import { createServer as createHttpServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { calculateResult } from "./public/scoring.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "public");
const DEFAULT_DATA_FILE = join(HERE, "data", "responses.json");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon"
};

const GROUPS = new Map();
for (const [canonical, variants] of Object.entries({
  "情绪": ["情绪", "情感", "心情"], "认知": ["认知", "思维", "思考", "心智"],
  "行为": ["行为", "行动", "人的行为"], "人际关系": ["人际", "人际关系", "社交", "关系"],
  "发展": ["发展", "成长", "心理发展"], "脑科学": ["大脑", "脑", "脑科学", "神经", "神经科学"],
  "学习": ["学习", "学习过程"], "幸福感": ["幸福", "幸福感", "福祉"], "压力": ["压力", "应激"], "梦": ["梦", "梦境"]
})) for (const variant of variants) GROUPS.set(variant, canonical);

const ANSWER_FIELDS = {
  college: "string", grade: "string", identity: "string", courseTaken: "string", recommendation: "string",
  recommendedCourse: "string", reasons: "array", misconception: "string", mascotKnown: "string", mascotMatch: "string",
  merchCount: "string", presenceRating: "string", primaryFocus: "string", futureVisibility: "array", lifeCourses: "array",
  lifeUses: "array", experimentJoined: "string", experimentReasons: "array", keywords: "array", publicCloudConsent: "boolean", privateText: "string"
};

export function normalizeKeyword(input) {
  const cleaned = String(input ?? "").normalize("NFKC").trim().replace(/[\s\p{P}\p{S}]+/gu, "").slice(0, 16);
  if (!cleaned) return null;
  return { original: cleaned, canonical: GROUPS.get(cleaned) ?? cleaned };
}

function sanitizeAnswers(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const output = {};
  for (const [field, type] of Object.entries(ANSWER_FIELDS)) {
    const value = source[field];
    if (type === "string" && value !== undefined) output[field] = String(value).trim().slice(0, field === "privateText" ? 180 : field === "recommendedCourse" ? 60 : 80);
    if (type === "array") output[field] = (Array.isArray(value) ? value : []).slice(0, field === "keywords" ? 3 : 20).map((item) => String(item).trim().slice(0, 80));
    if (type === "boolean") output[field] = value !== false;
  }
  return output;
}

function validateAnswers(answers) {
  const required = ["college", "grade", "identity", "courseTaken", "recommendation", "misconception", "mascotKnown", "presenceRating", "primaryFocus", "experimentJoined"];
  if (required.some((field) => !answers[field])) return "答卷字段不完整";
  if (!Number.isInteger(Number(answers.recommendation)) || Number(answers.recommendation) < 1 || Number(answers.recommendation) > 5) return "推荐程度无效";
  if (!Number.isInteger(Number(answers.presenceRating)) || Number(answers.presenceRating) < 1 || Number(answers.presenceRating) > 5) return "存在感评分无效";
  if (answers.keywords.length !== 3 || answers.keywords.some((word) => !word)) return "请填写三个关键词";
  return "";
}

async function loadStore(dataFile) {
  if (!existsSync(dataFile)) return { totalResponses: 0, words: {}, responses: [] };
  try {
    const data = JSON.parse(await readFile(dataFile, "utf8"));
    return { totalResponses: Number(data?.totalResponses) || 0, words: data?.words && typeof data.words === "object" ? data.words : {}, responses: Array.isArray(data?.responses) ? data.responses : [] };
  } catch { return { totalResponses: 0, words: {}, responses: [] }; }
}

async function saveStore(dataFile, store) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store" });
  res.end(body);
}

function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "content-length": Buffer.byteLength(body), "cache-control": "no-store" });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 131_072) throw new Error("payload_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function cloudPayload(store, minCount, limit) {
  const words = Object.entries(store.words).map(([canonical, item]) => ({
    canonical, count: item.count,
    variants: Object.entries(item.variants ?? {}).sort((a, b) => b[1] - a[1]).map(([word]) => word)
  })).filter((item) => item.count >= minCount)
    .sort((a, b) => b.count - a.count || a.canonical.localeCompare(b.canonical, "zh-CN")).slice(0, limit);
  return { totalResponses: store.totalResponses, minCount, words };
}

function addWordsToStore(store, normalized) {
  store.totalResponses += 1;
  for (const word of normalized) {
    const item = store.words[word.canonical] ?? { count: 0, variants: {} };
    item.count += 1;
    item.variants[word.original] = (item.variants[word.original] ?? 0) + 1;
    store.words[word.canonical] = item;
  }
}

function envConfig(env) {
  return {
    supabaseUrl: String(env.SUPABASE_URL ?? "").replace(/\/$/, ""), supabaseKey: String(env.SUPABASE_SERVICE_ROLE_KEY ?? ""),
    adminToken: String(env.ADMIN_TOKEN ?? ""), openaiKey: String(env.OPENAI_API_KEY ?? ""), openaiModel: String(env.OPENAI_MODEL ?? ""),
    publicCloudMinCount: Math.max(1, Math.min(20, Number(env.PUBLIC_CLOUD_MIN_COUNT) || 1))
  };
}

function hasSupabase(config) { return Boolean(config.supabaseUrl && config.supabaseKey); }

async function supabaseRequest(config, fetchImpl, path, options = {}) {
  const response = await fetchImpl(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: config.supabaseKey, authorization: `Bearer ${config.supabaseKey}`, "content-type": "application/json", ...(options.headers ?? {}) }
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`supabase_${response.status}:${raw.slice(0, 300)}`);
  return raw ? JSON.parse(raw) : null;
}

async function insertSupabaseRecord(config, fetchImpl, record) {
  const rows = await supabaseRequest(config, fetchImpl, "survey_responses", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(record) });
  return rows?.[0] ?? record;
}

async function listSupabaseRecords(config, fetchImpl) {
  const select = "id,created_at,college,grade,identity,answers,result_code,affinity,presence,orientation,cp_score,keywords,public_cloud_consent,message_to_xinyuan";
  const records = [];
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const page = await supabaseRequest(config, fetchImpl, `survey_responses?select=${select}&order=created_at.desc&limit=1000&offset=${offset}`) ?? [];
    records.push(...page);
    if (page.length < 1000) break;
  }
  return records;
}

function constantTimeEqual(actual, expected) {
  const a = Buffer.from(String(actual)); const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAdmin(req, config) {
  if (!config.adminToken) return false;
  const header = String(req.headers.authorization ?? "");
  return header.startsWith("Bearer ") && constantTimeEqual(header.slice(7), config.adminToken);
}

function countBy(rows, getValue) {
  const counts = {};
  for (const row of rows) {
    const value = getValue(row);
    if (value === undefined || value === null || value === "") continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "zh-CN")));
}

function average(rows, field) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0;
}

export function buildStatistics(rows) {
  return {
    generatedAt: new Date().toISOString(), totalResponses: rows.length,
    dimensions: { affinityAverage: average(rows, "affinity"), presenceAverage: average(rows, "presence"), cpAverage: average(rows, "cp_score"), orientation: countBy(rows, (row) => row.orientation) },
    personas: countBy(rows, (row) => row.result_code), colleges: countBy(rows, (row) => row.college), grades: countBy(rows, (row) => row.grade),
    identities: countBy(rows, (row) => row.identity), recommendation: countBy(rows, (row) => row.answers?.recommendation),
    misconceptions: countBy(rows, (row) => row.answers?.misconception), primaryFocus: countBy(rows, (row) => row.answers?.primaryFocus),
    experiments: countBy(rows, (row) => row.answers?.experimentJoined)
  };
}

function rowsToCloud(rows) {
  const store = { totalResponses: 0, words: {} };
  for (const row of rows) {
    if (row.public_cloud_consent === false) continue;
    const words = (Array.isArray(row.keywords) ? row.keywords : []).map((item) => item && typeof item === "object" && item.canonical ? item : normalizeKeyword(item)).filter(Boolean).slice(0, 3);
    if (words.length) addWordsToStore(store, words);
  }
  return store;
}

function csvEscape(value) {
  const textValue = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${textValue.replaceAll('"', '""')}"`;
}

function rowsToCsv(rows) {
  const headers = ["id", "created_at", "college", "grade", "identity", "result_code", "affinity", "presence", "orientation", "cp_score", "message_to_xinyuan", "answers_json"];
  return `\uFEFF${[headers.join(","), ...rows.map((row) => headers.map((field) => csvEscape(field === "answers_json" ? row.answers : row[field])).join(","))].join("\r\n")}`;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) for (const content of item?.content ?? []) if (content?.type === "output_text" && typeof content.text === "string") return content.text;
  return "";
}

async function createAiReport(config, fetchImpl, statistics) {
  if (!config.openaiKey || !config.openaiModel) throw new Error("openai_not_configured");
  const schema = {
    type: "object", additionalProperties: false,
    properties: {
      summary: { type: "string" }, findings: { type: "array", items: { type: "string" } },
      dimensionInterpretation: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } },
      caveats: { type: "array", items: { type: "string" } }
    }, required: ["summary", "findings", "dimensionInterpretation", "recommendations", "caveats"]
  };
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${config.openaiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: config.openaiModel, store: false, reasoning: { effort: "low" },
      instructions: "你是校园问卷统计分析助手。只分析所给匿名聚合数据，不推断个人身份，不虚构因果关系。用简洁中文区分事实、解释与建议，并明确样本量限制。",
      input: JSON.stringify(statistics), text: { format: { type: "json_schema", name: "xinyuan_survey_report", strict: true, schema } }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`openai_${response.status}:${JSON.stringify(payload).slice(0, 300)}`);
  const output = extractResponseText(payload);
  if (!output) throw new Error("openai_empty_output");
  return JSON.parse(output);
}

function buildRecord(answers) {
  const { privateText = "", ...analysisAnswers } = answers;
  const result = calculateResult(analysisAnswers);
  const keywords = analysisAnswers.keywords.map(normalizeKeyword).filter(Boolean).slice(0, 3);
  return {
    id: randomUUID(), created_at: new Date().toISOString(), college: analysisAnswers.college, grade: analysisAnswers.grade, identity: analysisAnswers.identity, answers: analysisAnswers,
    result_code: result.code, affinity: result.affinity, presence: result.presence, orientation: result.orientation, cp_score: result.cp,
    keywords: analysisAnswers.publicCloudConsent === false ? [] : keywords, public_cloud_consent: analysisAnswers.publicCloudConsent !== false,
    message_to_xinyuan: privateText
  };
}

export function createAppServer({ dataFile = DEFAULT_DATA_FILE, env = process.env, fetchImpl = fetch } = {}) {
  const config = envConfig(env);
  let localWriteQueue = Promise.resolve();
  const rate = new Map();
  const withLocalWrite = (task) => {
    const current = localWriteQueue.then(task, task);
    localWriteQueue = current.catch(() => {});
    return current;
  };
  const listRecords = async () => hasSupabase(config) ? listSupabaseRecords(config, fetchImpl) : (await loadStore(dataFile)).responses;

  return createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/api/v1/health") return json(res, 200, { ok: true, storage: hasSupabase(config) ? "supabase" : "local", ai: Boolean(config.openaiKey && config.openaiModel) });

      if (req.method === "POST" && url.pathname === "/api/v1/responses") {
        const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
        const now = Date.now(); const recent = (rate.get(ip) ?? []).filter((time) => now - time < 60_000);
        if (recent.length >= 8) return json(res, 429, { error: "提交过于频繁，请稍后再试" });
        recent.push(now); rate.set(ip, recent);
        const answers = sanitizeAnswers((await readJson(req)).answers);
        const validationError = validateAnswers(answers);
        if (validationError) return json(res, 400, { error: validationError });
        const record = buildRecord(answers);
        if (hasSupabase(config)) {
          const inserted = await insertSupabaseRecord(config, fetchImpl, record);
          return json(res, 201, { accepted: true, id: inserted.id, resultCode: record.result_code, storage: "supabase" });
        }
        await withLocalWrite(async () => {
          const store = await loadStore(dataFile); store.responses.push(record);
          if (record.public_cloud_consent && record.keywords.length) addWordsToStore(store, record.keywords);
          await saveStore(dataFile, store);
        });
        return json(res, 201, { accepted: true, id: record.id, resultCode: record.result_code, storage: "local" });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/psychology-keywords") {
        const body = await readJson(req);
        const normalized = (Array.isArray(body.words) ? body.words : []).map(normalizeKeyword).filter(Boolean).slice(0, 3);
        if (!normalized.length) return json(res, 400, { error: "请至少填写一个关键词" });
        if (body.publicCloudConsent === false) return json(res, 200, { accepted: false, normalized, reason: "consent_declined" });
        await withLocalWrite(async () => { const store = await loadStore(dataFile); addWordsToStore(store, normalized); await saveStore(dataFile, store); });
        return json(res, 200, { accepted: true, normalized });
      }

      if (req.method === "GET" && ["/api/v1/psychology-keywords/cloud", "/api/v1/stats/word-cloud"].includes(url.pathname)) {
        const requestedMin = Math.max(1, Math.min(99, Number(url.searchParams.get("minCount")) || config.publicCloudMinCount));
        const minCount = Math.max(config.publicCloudMinCount, requestedMin);
        const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 40));
        const store = hasSupabase(config) ? rowsToCloud(await listRecords()) : await loadStore(dataFile);
        return json(res, 200, cloudPayload(store, minCount, limit));
      }

      if (url.pathname.startsWith("/api/v1/stats/") || url.pathname.startsWith("/api/v1/admin/")) {
        if (!config.adminToken) return json(res, 503, { error: "ADMIN_TOKEN 尚未配置" });
        if (!isAdmin(req, config)) return json(res, 401, { error: "unauthorized" });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/stats/overview") return json(res, 200, buildStatistics(await listRecords()));
      if (req.method === "GET" && url.pathname === "/api/v1/stats/export.csv") return text(res, 200, rowsToCsv(await listRecords()), "text/csv; charset=utf-8");
      if (req.method === "POST" && url.pathname === "/api/v1/admin/ai-report") {
        if (!config.openaiKey || !config.openaiModel) return json(res, 503, { error: "OPENAI_API_KEY 或 OPENAI_MODEL 尚未配置" });
        const statistics = buildStatistics(await listRecords());
        return json(res, 200, { generatedAt: new Date().toISOString(), report: await createAiReport(config, fetchImpl, statistics) });
      }

      if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "method_not_allowed" });
      const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const filePath = normalize(join(PUBLIC_DIR, requested));
      if (relative(PUBLIC_DIR, filePath).startsWith("..")) return json(res, 403, { error: "forbidden" });
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream", "content-length": body.length, "cache-control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=300" });
      if (req.method === "HEAD") res.end(); else res.end(body);
    } catch (error) {
      if (error?.code === "ENOENT") return json(res, 404, { error: "not_found" });
      if (error?.message === "payload_too_large") return json(res, 413, { error: "payload_too_large" });
      if (error instanceof SyntaxError) return json(res, 400, { error: "invalid_json" });
      console.error(error); return json(res, 500, { error: "server_error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4173;
  createAppServer().listen(port, "0.0.0.0", () => console.log(`心院人格 H5 已启动：http://127.0.0.1:${port}`));
}
