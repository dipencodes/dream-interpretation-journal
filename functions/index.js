const functions = require("firebase-functions");
const OpenAI = require("openai");
const fetch = require("node-fetch");

const openai = new OpenAI({
  apiKey: functions.config().openai.key,
  fetch,
});

// Allowed source keys
const ALLOWED_SOURCES = [
  "hindu",
  "islamic",
  "christian",
  "scientific",
  "buddhist",
];

const DEFAULT_SOURCE = "hindu";

// Map source key -> vector store ID from Firebase config
function getVectorStoreId(sourceKey) {
  const cfg = functions.config().openai;

  const map = {
    hindu: cfg.vector_hindu_store_id,
    islamic: cfg.vector_islamic_store_id,
    christian: cfg.vector_christian_store_id,
    scientific: cfg.vector_scientific_store_id,
    buddhist: cfg.vector_buddhist_store_id,
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

exports.interpretDream = functions.https.onCall(async (data, context) => {
  // Require auth (anonymous is fine)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated."
    );
  }

  const { dreamText, dreamDate, sourceKey } = data;

  if (!dreamText || typeof dreamText !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "dreamText is required."
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

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are a dream interpretation assistant.

PRIMARY RULES:
1) Use textbook excerpts retrieved via file_search as the primary source.
2) If coverage is weak, still provide a helpful interpretation.
3) If coverage is weak, set "warning" to a non-null message explaining limited textbook coverage.
4) Never claim the textbook says something unless it appears in retrieved excerpts.

${getSourceInstruction(selectedSource)}

OUTPUT:
Return ONLY valid JSON (no markdown, no extra text):

{
  "summary": string,
  "interpretation": string,
  "warning": string | null
}

WRITING RULES:
- summary: 1-2 short sentences, max 35 words, plain language.
- interpretation: 2 short paragraphs, total 90-140 words.
- Be concrete, warm, and readable. Avoid repetition and long academic phrasing.
- Tone: calm, reflective, supportive. Avoid absolutes.
`
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

    return {
      summary,
      interpretation: parsed.interpretation,
      warning: parsed.warning || null,
    };
  } catch (error) {
    console.error("OpenAI error:", error);

    throw new functions.https.HttpsError(
      "internal",
      "Failed to interpret dream."
    );
  }
});
