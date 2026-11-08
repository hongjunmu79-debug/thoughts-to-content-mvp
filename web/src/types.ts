export type ContentFormat = "linkedin" | "x_thread" | "newsletter" | "blog" | "short_video";
export type FeedbackValue = "sounds_like_me" | "would_publish" | "too_ai";

export interface Generation {
  id: number;
  source_text: string;
  content: string;
  content_format: ContentFormat;
  voice_profile: string;
  preserved_phrases: string[];
  created_at: string;
}

export interface Health {
  status: "ok";
  generation_configured: boolean;
  transcription_configured: boolean;
}

