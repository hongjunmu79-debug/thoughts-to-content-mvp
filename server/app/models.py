from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


ContentFormat = Literal["linkedin", "x_thread", "newsletter", "blog", "short_video"]
FeedbackValue = Literal["sounds_like_me", "would_publish", "too_ai"]


class GenerateRequest(BaseModel):
    source_text: str = Field(min_length=20, max_length=20_000)
    content_format: ContentFormat
    voice_notes: str = Field(default="", max_length=2_000)

    @field_validator("source_text")
    @classmethod
    def source_must_have_words(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned.split()) < 3 and len(cleaned) < 30:
            raise ValueError("Please provide a more substantial thought.")
        return cleaned


class GenerateResponse(BaseModel):
    id: int
    source_text: str
    content: str
    content_format: ContentFormat
    voice_profile: str
    preserved_phrases: list[str]
    created_at: str


class FeedbackRequest(BaseModel):
    generation_id: int = Field(gt=0)
    value: FeedbackValue


class FeedbackResponse(BaseModel):
    id: int
    generation_id: int
    value: FeedbackValue
    created_at: str


class TranscriptionResponse(BaseModel):
    text: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    generation_configured: bool
    transcription_configured: bool

