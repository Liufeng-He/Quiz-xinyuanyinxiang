export const ARCHETYPES = {
  AVE: {
    short: "A · V · E",
    nickname: "聚光求真者",
    name: "聚光灯下的理性领航员",
    tagline: "有温度，也有方法；你已经看见它如何把复杂问题讲清楚。",
    summary: "你眼中的心院既值得靠近，也在校园里足够醒目。最吸引你的，是课程、研究和证据共同构成的探索感。",
    advice: "别只让成果发光，也让参与入口更好找。",
    palette: ["#5B4B8A", "#55A79D", "#F5C76D"],
    symbol: "scope"
  },
  AVC: {
    short: "A · V · C",
    nickname: "校园暖光者",
    name: "校园里的暖光搭子",
    tagline: "你感受到的心院，是会出现、会回应、也愿意陪人走一段的。",
    summary: "心院像一个经常出现、愿意回应，也能把心理学带进日常的人。活动、服务与校园文化让它显得亲切而具体。",
    advice: "把温柔做成稳定、可持续的公共体验。",
    palette: ["#D66E5B", "#58A99F", "#FFE6A7"],
    symbol: "lamp"
  },
  ALE: {
    short: "A · L · E",
    nickname: "深潜研究者",
    name: "藏在楼里的冷静侦探",
    tagline: "你认可它的学术含量，只是它还习惯安静地把答案藏在实验室里。",
    summary: "你对心院有明确好感，也认可它的研究含量；只是目前它更像一位安静工作的研究者，还没有频繁走进校园日常。",
    advice: "把研究过程讲出来，你们会更容易被看见。",
    palette: ["#4B5791", "#8BA9B9", "#D8DCEB"],
    symbol: "lens"
  },
  ALC: {
    short: "A · L · C",
    nickname: "安静倾听者",
    name: "安静递伞的温柔邻居",
    tagline: "好感已经出现，但它更像低声的陪伴，而不是热闹的存在。",
    summary: "你相信心院愿意理解和帮助人，只是许多服务、活动与接触入口仍藏得有点深。",
    advice: "让信息少一点寻宝感，让第一次靠近更轻松。",
    palette: ["#7A6DA8", "#75AAA3", "#E8D9EE"],
    symbol: "umbrella"
  },
  WVE: {
    short: "W · V · E",
    nickname: "理性实验家",
    name: "高能但有距离的实验指挥官",
    tagline: "专业与存在感都在线，但你还在衡量难度、投入和真实获得。",
    summary: "你看得见心院，也承认它的研究与专业存在感；是否愿意靠近，则取决于课程难度、信息透明度与实际体验。",
    advice: "降低理解门槛，不等于降低专业标准。",
    palette: ["#415B82", "#6A91A8", "#D9B96E"],
    symbol: "console"
  },
  WVC: {
    short: "W · V · C",
    nickname: "日常连接者",
    name: "热闹橱窗里的生活策展人",
    tagline: "你已经看见它的活动与温度，还在判断这些内容能否形成真正有用的关系。",
    summary: "心院的服务、活动或文化形象已经进入你的视野，但你仍在观察：好看、好玩之外，它能否稳定回应现实需要。",
    advice: "从看见走到参与，需要更明确的下一步。",
    palette: ["#C86758", "#58A69A", "#F2C986"],
    symbol: "window"
  },
  WLE: {
    short: "W · L · E",
    nickname: "雾中求证者",
    name: "迷雾中的科学研究者",
    tagline: "你隐约知道它很严谨，但信息与接触还不足以让轮廓完全清晰。",
    summary: "你知道心院有科学与研究的一面，只是很多判断仍停留在想象、传闻或专业刻板印象里。",
    advice: "先给一扇看得懂的窗，再邀请人走进实验室。",
    palette: ["#4C4777", "#7896A2", "#C8D3DC"],
    symbol: "fog"
  },
  WLC: {
    short: "W · L · C",
    nickname: "初见同路人",
    name: "尚未打招呼的神秘同桌",
    tagline: "你们还没对上暗号，一次轻松、实用、友好的相遇也许就是开场。",
    summary: "目前的心院对你既不算熟悉，也还没有形成明确好恶。你更可能从一场活动、一条有用信息或一个友好角色开始认识它。",
    advice: "第一句招呼要轻、真诚，而且让人知道接下来能做什么。",
    palette: ["#77698B", "#A997A8", "#E8D8D5"],
    symbol: "hello"
  }
};

export const MISCONCEPTION_TAGS = {
  mindread: "认知",
  hypnosis: "认知",
  development: "发展",
  counseling: "临床与咨询",
  lie: "社会与人格",
  brain: "脑与神经",
  freud: "临床与咨询"
};

const REASON_EFFECTS = {
  teacher: 5, interest: 5, useful: 5, science: 5, challenge_gain: 5, workload_match: 5, friendly: 5,
  info_limited: 0, course_varies: 0, difficulty_concern: -5, workload_concern: -5, fit_varies: 0, mixed: 0,
  difficulty_high: -5, workload_bad: -5, expectation_gap: -5, low_use: -5, teaching_bad: -5, info_only: 5
};

const INNER_MAP = {
  debunk_mindread: { science: 1 },
  evidence: { science: 1 },
  no_diagnose: { boundary: 1 },
  refuse_free: { boundary: 1 },
  allow_emotion: { emotion: 1 },
  understand_self: { self: 1 },
  deadline: { action: 1 },
  pseudoscience: { science: 0.5, boundary: 0.5 },
  jargon: { relation: 1 },
  regulate: { emotion: 1 },
  communicate: { relation: 1 },
  why_me: { self: 1 },
  relationship: { relation: 1 },
  behavior_no_diagnosis: { science: 0.5, boundary: 0.5 },
  habit_change: { action: 1 },
  everywhere: { action: 0.5, self: 0.5 },
  no_change: { self: 0.5 }
};

const INNER_LABELS = {
  science: "科学求真",
  self: "自我理解",
  emotion: "情绪照料",
  relation: "关系联结",
  boundary: "边界安全",
  action: "成长行动"
};

const EXPERIMENT_MAP = {
  curious_result: { mystery: 1 }, game: { fun: 1 }, rigorous: { serious: 1 }, normal: { mystery: 1 },
  hidden_goal: { mystery: 1 }, compensation: { practical: 1 }, reflect: { serious: 1 }, calm: { safety: 1 },
  mismatch: { practical: 1 }, closed: { practical: 1 }, no_link: { fun: 1 }, busy: { practical: 1 },
  learn_first: { safety: 1 }, privacy: { safety: 1 }, discomfort: { safety: 1 },
  science_busy: { serious: 0.5, practical: 0.5 }, science_pay: { serious: 0.5, practical: 0.5 }, no_interest: {}
};

const EXPERIMENT_LABELS = {
  serious: "严谨科学",
  fun: "趣味互动",
  mystery: "神秘探索",
  practical: "现实权衡",
  safety: "安全信任"
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function addVector(target, vector) {
  for (const [key, value] of Object.entries(vector ?? {})) target[key] = (target[key] ?? 0) + value;
}

function cosine(a, b) {
  const keys = Object.keys(INNER_LABELS);
  const dot = keys.reduce((sum, key) => sum + (a[key] ?? 0) * (b[key] ?? 0), 0);
  const magA = Math.sqrt(keys.reduce((sum, key) => sum + (a[key] ?? 0) ** 2, 0));
  const magB = Math.sqrt(keys.reduce((sum, key) => sum + (b[key] ?? 0) ** 2, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function topLabels(vector, labels, limit = 2) {
  return Object.entries(vector)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => labels[key]);
}

export function calculateResult(state) {
  const recommendation = Number(state.recommendation || 3);
  const recScore = [0, 0, 25, 50, 75, 100][recommendation];
  const reasons = state.reasons ?? [];
  const reasonBase = recommendation >= 4 ? 75 : recommendation === 3 ? 50 : 25;
  const reasonAdjust = reasons.reduce((sum, id) => sum + (REASON_EFFECTS[id] ?? 0), 0);
  const reasonScore = clamp(reasonBase + reasonAdjust);
  const affinity = Math.round(0.75 * recScore + 0.25 * reasonScore);

  const mascotRecognition = state.mascotKnown === "yes"
    ? (state.mascotMatch === "yes" ? 100 : 50)
    : 0;
  const merchScores = { "0": 0, "1-5": 50, "6-10": 75, "11+": 100 };
  const mascotPresence = (mascotRecognition + (merchScores[state.merchCount] ?? 0)) / 2;
  const presenceRating = ([0, 0, 25, 50, 75, 100][Number(state.presenceRating || 1)] ?? 0);
  const presence = Math.round(0.55 * mascotPresence + 0.45 * presenceRating);

  const exploreIds = new Set(["courses", "research", "training"]);
  const orientation = exploreIds.has(state.primaryFocus) ? "E" : "C";

  const code = `${affinity >= 55 ? "A" : "W"}${presence >= 50 ? "V" : "L"}${orientation}`;
  const archetype = ARCHETYPES[code];

  const inner = { science: 0, self: 0, emotion: 0, relation: 0, boundary: 0, action: 0 };
  for (const id of [...(state.lifeCourses ?? []), ...(state.lifeUses ?? [])]) addVector(inner, INNER_MAP[id]);
  const innerTags = topLabels(inner, INNER_LABELS, 2);

  const experiment = { serious: 0, fun: 0, mystery: 0, practical: 0, safety: 0 };
  for (const id of state.experimentReasons ?? []) addVector(experiment, EXPERIMENT_MAP[id]);
  const experimentTags = topLabels(experiment, EXPERIMENT_LABELS, 2);
  if (!experimentTags.length && (state.experimentReasons ?? []).includes("no_interest")) experimentTags.push("尚未建立实验兴趣");

  const supply = {
    science: orientation === "E" ? 1 : 0.35,
    self: orientation === "E" ? 0.8 : 0.55,
    emotion: orientation === "C" ? 1 : 0.35,
    relation: orientation === "C" ? 1 : 0.35,
    boundary: affinity >= 55 ? 0.9 : 0.45,
    action: presence >= 50 ? 0.85 : 0.4
  };
  const similarity = cosine(inner, supply) * 100;
  const futureCount = Math.min(4, (state.futureVisibility ?? []).length);
  const experimentOpenness = state.experimentJoined === "yes"
    ? 80
    : ((state.experimentReasons ?? []).includes("no_interest") ? 20 : 50);
  const engagement = Math.round((futureCount / 4) * 60 + experimentOpenness * 0.4);
  const cp = Math.round(clamp(0.35 * affinity + 0.2 * presence + 0.35 * similarity + 0.1 * engagement));
  const cpBand = cp >= 85
    ? ["锁死级同频", "你期待的心理学，和你眼中的心院几乎在同一频道。"]
    : cp >= 70
      ? ["CP 感升温", "你们已经有清楚的共同语言，只差更多真实相处。"]
      : cp >= 55
        ? ["慢热有戏", "吸引点已经出现，还需要一两个具体体验把关系坐实。"]
        : cp >= 40
          ? ["礼貌同框", "你看见了心院，但它还没有精准回应你最在意的东西。"]
          : ["尚未对上暗号", "不是不合适，而是目前的接触和信息还不足以形成默契。"];

  const confidenceCount = [state.recommendation, state.mascotKnown, state.merchCount, state.presenceRating, state.primaryFocus]
    .filter((value) => value !== undefined && value !== "").length;

  return {
    code,
    archetype,
    affinity,
    presence,
    orientation,
    orientationLabel: orientation === "E" ? "探索" : "陪伴",
    misconceptionTag: MISCONCEPTION_TAGS[state.misconception] ?? "开放观察",
    inner,
    innerTags,
    experimentTags,
    cp,
    cpTitle: cpBand[0],
    cpText: cpBand[1],
    confidence: confidenceCount === 5 && reasons.length ? "画像清晰" : "画像发展中",
    courseBasis: state.courseTaken === "no" ? "基于现有印象" : "结合修课体验"
  };
}

export function buildPrivateReply(state, result) {
  const text = String(state.privateText ?? "").trim();
  if (!text) return "";
  const topic = /实验|研究|科学/.test(text)
    ? "研究和实验"
    : /咨询|服务|心理健康|求助/.test(text)
      ? "心理服务"
      : /课程|老师|上课/.test(text)
        ? "课程体验"
        : /活动|讲座|工作坊/.test(text)
          ? "校园活动"
          : /吉祥物|周边|文创/.test(text)
            ? "校园文化"
            : "真正关心的问题";
  const stance = result.affinity >= 55 ? "你已经愿意靠近" : "你想先看清楚再靠近";
  return `${stance}，这很合理。我们听见了你对“${topic}”的在意；下一次出现时，心院应该把入口、过程和你能获得什么都说得更明白。`;
}
