const functions = require("firebase-functions");
const {defineSecret, defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
const OpenAI = require("openai");
const fetch = require("node-fetch");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OPENAI_VECTOR_HINDU_STORE_ID = defineString(
  "OPENAI_VECTOR_HINDU_STORE_ID",
  {default: ""}
);
const OPENAI_VECTOR_ISLAMIC_STORE_ID = defineString(
  "OPENAI_VECTOR_ISLAMIC_STORE_ID",
  {default: ""}
);
const OPENAI_VECTOR_CHRISTIAN_STORE_ID = defineString(
  "OPENAI_VECTOR_CHRISTIAN_STORE_ID",
  {default: ""}
);
const OPENAI_VECTOR_SCIENTIFIC_STORE_ID = defineString(
  "OPENAI_VECTOR_SCIENTIFIC_STORE_ID",
  {default: ""}
);
const OPENAI_VECTOR_BUDDHIST_STORE_ID = defineString(
  "OPENAI_VECTOR_BUDDHIST_STORE_ID",
  {default: ""}
);

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const MODEL_NAME = "gpt-4.1-mini";
const PROMPT_VERSION = "v2_cost_optimized_2026_04_13";
const CACHE_COLLECTION = "interpretation_cache_v1";
const METRICS_COLLECTION = "metrics";
const METRICS_DOC_ID = "openai_interpretation";
const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
const FILE_SEARCH_MAX_NUM_RESULTS = 3;
const MAX_DREAM_TEXT_LENGTH = 3000;
const MAX_OUTPUT_TOKENS = 1000;
const RATE_LIMIT_COLLECTION = "rateLimits";
const DAILY_RATE_LIMIT = 20;
const RATE_LIMIT_TTL_DAYS = 7;
const RATE_LIMIT_TTL_MS = RATE_LIMIT_TTL_DAYS * 24 * 60 * 60 * 1000;

// Estimated model pricing in USD per 1M tokens.
const MODEL_INPUT_COST_PER_1M_USD = 0.4;
const MODEL_OUTPUT_COST_PER_1M_USD = 1.6;

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
      fetch,
    });
  }

  return openaiClient;
}

// Allowed source keys
const ALLOWED_SOURCES = [
  "hindu",
  "islamic",
  "christian",
  "scientific",
  "buddhist",
];

const DEFAULT_SOURCE = "hindu";

// Map source key -> vector store ID from parameterized config.
function getVectorStoreId(sourceKey) {
  const map = {
    hindu: OPENAI_VECTOR_HINDU_STORE_ID.value(),
    islamic: OPENAI_VECTOR_ISLAMIC_STORE_ID.value(),
    christian: OPENAI_VECTOR_CHRISTIAN_STORE_ID.value(),
    scientific: OPENAI_VECTOR_SCIENTIFIC_STORE_ID.value(),
    buddhist: OPENAI_VECTOR_BUDDHIST_STORE_ID.value(),
  };

  return map[sourceKey] || null;
}

// Optional source-specific instruction
function getSourceInstruction(sourceKey) {
  switch (sourceKey) {
    case "hindu":
      return "Use the Hindu interpretive framework found in the textbook excerpts when relevant.";
    case "islamic":
      return "Use the Islamic interpretive framework found in the textbook excerpts when relevant.";
    case "christian":
      return "Use the Christian interpretive framework found in the textbook excerpts when relevant.";
    case "scientific":
      return "Use the scientific/psychological interpretive framework found in the textbook excerpts when relevant.";
    case "buddhist":
      return "Use the Buddhist interpretive framework found in the textbook excerpts when relevant.";
    default:
      return "";
  }
}

function getSystemPrompt(selectedSource) {
  return `
You are a dream interpretation assistant.

Use retrieved textbook excerpts as primary evidence.
If coverage is limited, still help and set "warning" to a clear limitation note.
Never claim a textbook says something unless it appears in retrieved excerpts.
${getSourceInstruction(selectedSource)}

Return strict JSON only:
{
  "summary": string,
  "interpretation": string,
  "warning": string | null
}

Writing rules:
- summary: 1-2 short sentences, max 35 words.
- interpretation: 2 short paragraphs, total 90-140 words.
- Tone: warm, calm, concrete, reflective, no absolutes.
`;
}

function normalizeDreamText(input) {
  return input
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
}

function buildCacheKey({dreamText, sourceKey, model, promptVersion}) {
  const normalizedDreamText = normalizeDreamText(dreamText);
  return crypto
      .createHash("sha256")
      .update(
          JSON.stringify({
            normalizedDreamText,
            sourceKey,
            model,
            promptVersion,
          })
      )
      .digest("hex");
}

function getUsageTokens(response) {
  const inputTokens = Number(response?.usage?.input_tokens || 0);
  const outputTokens = Number(response?.usage?.output_tokens || 0);
  const totalTokens = Number(response?.usage?.total_tokens || inputTokens + outputTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function estimateTokenCostUsd(usageTokens) {
  const estimatedUsd =
    ((usageTokens.inputTokens * MODEL_INPUT_COST_PER_1M_USD) +
      (usageTokens.outputTokens * MODEL_OUTPUT_COST_PER_1M_USD)) /
    1000000;
  return Number(estimatedUsd.toFixed(8));
}

async function getCachedInterpretation(cacheKey) {
  const docRef = db.collection(CACHE_COLLECTION).doc(cacheKey);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  const expiresAt = data.expiresAt;
  if (!expiresAt || typeof expiresAt.toMillis !== "function") return null;
  if (expiresAt.toMillis() <= Date.now()) return null;

  if (typeof data.interpretation !== "string" || !data.interpretation.trim()) {
    return null;
  }

  return {
    summary: typeof data.summary === "string" && data.summary.trim() ? data.summary : null,
    interpretation: data.interpretation,
    warning: typeof data.warning === "string" && data.warning.trim() ? data.warning : null,
  };
}

async function setCachedInterpretation(cacheKey, payload, sourceKey) {
  const nowMs = Date.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + CACHE_TTL_MS);

  await db.collection(CACHE_COLLECTION).doc(cacheKey).set({
    summary: payload.summary,
    interpretation: payload.interpretation,
    warning: payload.warning,
    sourceKey,
    model: MODEL_NAME,
    promptVersion: PROMPT_VERSION,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });
}

function getUtcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Transactionally increments today's per-uid request count and returns the
// count *after* incrementing. Callers compare this against DAILY_RATE_LIMIT.
async function incrementDailyRateLimit(uid) {
  const dateString = getUtcDateString();
  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(`${uid}_${dateString}`);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    const currentCount = doc.exists ? Number(doc.data().count || 0) : 0;
    const nextCount = currentCount + 1;

    transaction.set(docRef, {
      uid,
      date: dateString,
      count: nextCount,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + RATE_LIMIT_TTL_MS),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    return nextCount;
  });
}

async function recordUsageMetrics({
  cacheHit,
  cacheBypassed,
  openaiRequested,
  success,
  usageTokens,
  estimatedCostUsd,
}) {
  const docRef = db.collection(METRICS_COLLECTION).doc(METRICS_DOC_ID);
  const increment = admin.firestore.FieldValue.increment;

  const update = {
    total_requests: increment(1),
    cache_hits: increment(cacheHit ? 1 : 0),
    cache_misses: increment(cacheHit ? 0 : 1),
    cache_bypassed_requests: increment(cacheBypassed ? 1 : 0),
    successful_requests: increment(success ? 1 : 0),
    failed_requests: increment(success ? 0 : 1),
    openai_requests: increment(openaiRequested ? 1 : 0),
    openai_successful_requests: increment(openaiRequested && success ? 1 : 0),
    input_tokens: increment(usageTokens ? usageTokens.inputTokens : 0),
    output_tokens: increment(usageTokens ? usageTokens.outputTokens : 0),
    total_tokens: increment(usageTokens ? usageTokens.totalTokens : 0),
    estimated_cost_usd: increment(typeof estimatedCostUsd === "number" ? estimatedCostUsd : 0),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(update, {merge: true});
}

exports.interpretDream = functions
    .runWith({secrets: [OPENAI_API_KEY]})
    .https.onCall(async (data, context) => {
  // Require auth (anonymous is fine)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated."
    );
  }

  const {dreamText, dreamDate, sourceKey, forceRefresh} = data;

  if (!dreamText || typeof dreamText !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "dreamText is required."
    );
  }

  if (dreamText.length > MAX_DREAM_TEXT_LENGTH) {
    console.warn("interpretDream rejected: dreamText too long", {
      uid: context.auth.uid,
      dreamTextLength: dreamText.length,
      maxDreamTextLength: MAX_DREAM_TEXT_LENGTH,
    });
    throw new functions.https.HttpsError(
      "invalid-argument",
      `dreamText must be ${MAX_DREAM_TEXT_LENGTH} characters or fewer.`
    );
  }

  if (forceRefresh !== undefined && typeof forceRefresh !== "boolean") {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "forceRefresh must be a boolean when provided."
    );
  }

  let selectedSource = DEFAULT_SOURCE;

  if (sourceKey) {
    if (!ALLOWED_SOURCES.includes(sourceKey)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid sourceKey."
      );
    }
    selectedSource = sourceKey;
  }

  const vectorStoreId = getVectorStoreId(selectedSource);

  if (!vectorStoreId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Source '${selectedSource}' is not available yet.`
    );
  }

  const rateLimitCount = await incrementDailyRateLimit(context.auth.uid);
  if (rateLimitCount > DAILY_RATE_LIMIT) {
    console.warn("interpretDream rejected: daily rate limit exceeded", {
      uid: context.auth.uid,
      date: getUtcDateString(),
      count: rateLimitCount,
      dailyRateLimit: DAILY_RATE_LIMIT,
    });
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Daily interpretation limit reached. Please try again tomorrow."
    );
  }

  const shouldBypassCache = forceRefresh === true;
  const cacheKey = buildCacheKey({
    dreamText,
    sourceKey: selectedSource,
    model: MODEL_NAME,
    promptVersion: PROMPT_VERSION,
  });

  if (!shouldBypassCache) {
    try {
      const cachedResult = await getCachedInterpretation(cacheKey);
      if (cachedResult) {
        console.log("interpretDream cache hit", {
          sourceKey: selectedSource,
          promptVersion: PROMPT_VERSION,
          model: MODEL_NAME,
        });
        try {
          await recordUsageMetrics({
            cacheHit: true,
            cacheBypassed: false,
            openaiRequested: false,
            success: true,
            usageTokens: null,
            estimatedCostUsd: 0,
          });
        } catch (metricsError) {
          console.error("Metrics write error (cache hit):", metricsError);
        }
        return cachedResult;
      }
    } catch (cacheReadError) {
      console.error("Cache read error:", cacheReadError);
    }
  }

  let openaiRequested = false;
  try {
    openaiRequested = true;
    const response = await getOpenAIClient().responses.create({
      model: MODEL_NAME,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      input: [
        {
          role: "system",
          content: getSystemPrompt(selectedSource),
        },
        {
          role: "user",
          content: `
Source: ${selectedSource}
Dream date: ${dreamDate || "Unknown"}

Dream:
${dreamText}

Interpret this dream.
`
        }
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: FILE_SEARCH_MAX_NUM_RESULTS,
        },
      ],
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error("No output_text returned.");
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (err) {
      console.error("Invalid JSON from model:", outputText);
      throw new Error("Model returned invalid JSON.");
    }

    if (!parsed.interpretation) {
      throw new Error("Missing interpretation field.");
    }

    const summary = typeof parsed.summary === "string" && parsed.summary.trim() ?
      parsed.summary.trim() :
      null;

    const payload = {
      summary,
      interpretation: parsed.interpretation,
      warning: parsed.warning || null,
    };

    const usageTokens = getUsageTokens(response);
    const estimatedCostUsd = estimateTokenCostUsd(usageTokens);

    console.log("interpretDream openai usage", {
      sourceKey: selectedSource,
      promptVersion: PROMPT_VERSION,
      model: MODEL_NAME,
      cacheBypassed: shouldBypassCache,
      cacheMiss: true,
      inputTokens: usageTokens.inputTokens,
      outputTokens: usageTokens.outputTokens,
      totalTokens: usageTokens.totalTokens,
      estimatedCostUsd,
    });

    try {
      await setCachedInterpretation(cacheKey, payload, selectedSource);
    } catch (cacheWriteError) {
      console.error("Cache write error:", cacheWriteError);
    }

    try {
      await recordUsageMetrics({
        cacheHit: false,
        cacheBypassed: shouldBypassCache,
        openaiRequested: true,
        success: true,
        usageTokens,
        estimatedCostUsd,
      });
    } catch (metricsError) {
      console.error("Metrics write error (success):", metricsError);
    }

    return payload;
  } catch (error) {
    console.error("OpenAI error:", error);

    try {
      await recordUsageMetrics({
        cacheHit: false,
        cacheBypassed: shouldBypassCache,
        openaiRequested,
        success: false,
        usageTokens: null,
        estimatedCostUsd: 0,
      });
    } catch (metricsError) {
      console.error("Metrics write error (failure):", metricsError);
    }

    throw new functions.https.HttpsError(
      "internal",
      "Failed to interpret dream."
    );
  }
    });
