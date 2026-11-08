import type { ContentFormat, FeedbackValue, Generation, Health } from "./types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status})`);
  }
  return data as T;
}

export function getHealth() {
  return request<Health>("/api/health");
}

export function generateContent(sourceText: string, contentFormat: ContentFormat, voiceNotes: string) {
  return request<Generation>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_text: sourceText, content_format: contentFormat, voice_notes: voiceNotes }),
  });
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
  formData.append("audio", blob, `thought.${extension}`);
  const result = await request<{ text: string }>("/api/transcribe", { method: "POST", body: formData });
  return result.text;
}

export function saveFeedback(generationId: number, value: FeedbackValue) {
  return request("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generation_id: generationId, value }),
  });
}

