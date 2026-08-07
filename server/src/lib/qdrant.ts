import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const COLLECTION_NAME = "meetingmind_utterances";

export async function ensureCollectionExists(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // text-embedding-3-small dimension
          distance: "Cosine",
        },
      });
    }
  } catch (error) {
    console.warn("Qdrant not available or mock mode active:", error instanceof Error ? error.message : error);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (openai && process.env.OPENAI_API_KEY !== "your-openai-api-key") {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      console.warn("OpenAI embedding API call failed, generating deterministic fallback vector:", err);
    }
  }
  // Deterministic mock 1536-dim vector for testing/offline mode
  const vector = new Array(1536).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 1536; i++) {
    vector[i] = Math.sin(hash + i);
  }
  return vector;
}

export async function indexUtterancesInQdrant(
  meetingId: string,
  utterances: Array<{ utteranceId: string; speaker: string; text: string; timestamp: string; utteranceIndex: number }>
): Promise<Map<string, string>> {
  await ensureCollectionExists();

  const pointIdMap = new Map<string, string>();
  const points = [];

  for (const utt of utterances) {
    const vector = await generateEmbedding(utt.text);
    // Use a numeric hash or UUID-formatted point id for Qdrant
    const pointId = `${utt.utteranceId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    pointIdMap.set(utt.utteranceId, pointId);

    points.push({
      id: pointId,
      vector,
      payload: {
        meetingId,
        utteranceId: utt.utteranceId,
        speaker: utt.speaker,
        text: utt.text,
        timestamp: utt.timestamp,
        utteranceIndex: utt.utteranceIndex,
      },
    });
  }

  try {
    if (points.length > 0) {
      await qdrantClient.upsert(COLLECTION_NAME, {
        points,
      });
    }
  } catch (error) {
    console.warn("Failed to index into Qdrant (mocking persistence):", error instanceof Error ? error.message : error);
  }

  return pointIdMap;
}
