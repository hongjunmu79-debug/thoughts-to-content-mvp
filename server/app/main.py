from __future__ import annotations

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Database
from .llm import DeepSeekGenerator, GenerationError
from .models import (
    FeedbackRequest,
    FeedbackResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    TranscriptionResponse,
)
from .transcription import Transcriber, TranscriptionError


db = Database(settings.database_path)
generator = DeepSeekGenerator(settings)
transcriber = Transcriber(settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.initialize()
    yield


app = FastAPI(
    title="Thoughts to Content API",
    version="0.1.0",
    description="Voice-preserving content generation and validation feedback.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.web_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        generation_configured=bool(settings.deepseek_api_key),
        transcription_configured=bool(settings.stt_api_key),
    )


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    try:
        result = await generator.generate(request)
    except GenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    row = db.save_generation(
        source_text=request.source_text,
        output_text=result.content,
        content_format=request.content_format,
        voice_profile=result.voice_profile,
        preserved_phrases=json.dumps(result.preserved_phrases, ensure_ascii=False),
    )
    return GenerateResponse(
        id=row["id"],
        source_text=row["source_text"],
        content=row["output_text"],
        content_format=row["content_format"],
        voice_profile=row["voice_profile"],
        preserved_phrases=json.loads(row["preserved_phrases"]),
        created_at=row["created_at"],
    )


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscriptionResponse:
    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(payload) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Recordings must be under 25 MB.")
    try:
        text = await transcriber.transcribe(
            audio.filename or "recording.webm",
            audio.content_type or "audio/webm",
            payload,
        )
    except TranscriptionError as exc:
        status = 503 if not settings.stt_api_key else 502
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TranscriptionResponse(text=text)


@app.post("/api/feedback", response_model=FeedbackResponse, status_code=201)
def feedback(request: FeedbackRequest) -> FeedbackResponse:
    try:
        row = db.save_feedback(request.generation_id, request.value)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Generation not found.") from exc
    return FeedbackResponse(**row)


@app.get("/api/feedback")
def list_feedback(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    """Acceptance/debug endpoint: proves feedback is persisted in SQLite."""
    return db.recent_feedback(limit)

