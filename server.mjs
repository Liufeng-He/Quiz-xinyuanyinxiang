import { createServer as createHttpServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "public");
const DEFAULT_DATA_FILE = join(HERE, "data", "keywords.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const GROUPS = new Map();
for (const [canonical, variants] of Object.entries({
  "情绪": ["情绪", "情感", "心情"],
  "认知": ["认知", "思维", "思考", "心智"],
  "行为": ["行为", "行动", "人的行为"],
  "人际关系": ["人际", "人际关系", "社交", "关系"],
  "发展": ["发展", "成长", "心理发展"],
  "脑科学": ["大脑", "脑", "脑科学", "神经", "神经科学"],
  "学习": ["学习", "学习过程"],
  "幸福感": ["幸福", "幸福感", "福祉"],
  "压力": ["压力", "应激"],
  "梦": ["梦", "梦境"]
})) {
  for (const variant of variants) GROUPS.set(variant, canonical);
}

export function normalizeKeyword(input) {
  const cleaned = String(input ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 16);
  if (!cleaned) return null;
  return { original: cleaned, canonical: GROUPS.get(cleaned) ?? cleaned };
}

async function loadStore(dataFile) {
  if (!existsSync(dataFile)) return { totalResponses: 0, words: {} };
  try {
    const data = JSON.parse(await readFile(dataFile, "utf8"));
    return data && data.words ? data : { totalResponses: 0, words: {} };
  } catch {
    return { totalResponses: 0, words: {} };
  }
}

async function saveStore(dataFile, store) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 32_768) throw new Error("payload_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function cloudPayload(store, minCount, limit) {
  const words = Object.entries(store.words)
    .map(([canonical, item]) => ({
      canonical,
      count: item.count,
      variants: Object.entries(item.variants ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word)
    }))
    .filter((item) => item.count >= minCount)
    .sort((a, b) => b.count - a.count || a.canonical.localeCompare(b.canonical, "zh-CN"))
    .slice(0, limit);
  return { totalResponses: store.totalResponses, minCount, words };
}

export function createAppServer({ dataFile = DEFAULT_DATA_FILE } = {}) {
  return createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");

      if (req.method === "POST" && url.pathname === "/api/v1/psychology-keywords") {
        const body = await readJson(req);
        const rawWords = Array.isArray(body.words) ? body.words : [];
        const normalized = rawWords.map(w => normalizeKeyword(w)).filter(Boolean);

        if (normalized.length === 0) {
          return json(res, 400, { error: "请至少填写一个关键词" });
        }

        const wordsToSave = normalized.slice(0, 3);

        if (body.publicCloudConsent === false) {
          return json(res, 200, { accepted: false, normalized: wordsToSave, reason: "consent_declined" });
        }

        const store = await loadStore(dataFile);
        store.totalResponses += 1;

        for (const word of wordsToSave) {
          const item = store.words[word.canonical] ?? { count: 0, variants: {} };
          item.count += 1;
          item.variants[word.original] = (item.variants[word.original] ?? 0) + 1;
          store.words[word.canonical] = item;
        }

        await saveStore(dataFile, store);
        return json(res, 200, { accepted: true, normalized: wordsToSave, totalResponses: store.totalResponses });
      }

      if (req.method === "GET" && url.pathname === "/api/v1/psychology-keywords/cloud") {
        const minCount = Math.max(1, Math.min(99, Number(url.searchParams.get("minCount")) || 1));
        const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 40));
        const store = await loadStore(dataFile);
        return json(res, 200, cloudPayload(store, minCount, limit));
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        return json(res, 405, { error: "method_not_allowed" });
      }

      const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const filePath = normalize(join(PUBLIC_DIR, requested));
      if (relative(PUBLIC_DIR, filePath).startsWith("..")) {
        return json(res, 403, { error: "forbidden" });
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
        "content-length": body.length,
        "cache-control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=300"
      });
      if (req.method === "HEAD") res.end();
      else res.end(body);
    } catch (error) {
      if (error?.code === "ENOENT") return json(res, 404, { error: "not_found" });
      if (error?.message === "payload_too_large") return json(res, 413, { error: "payload_too_large" });
      console.error(error);
      return json(res, 500, { error: "server_error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4173;
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`心院人格 H5 已启动：http://127.0.0.1:${port}`);
  });
}
