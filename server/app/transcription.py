from __future__ import annotations

import httpx

from .config import Settings


class TranscriptionError(RuntimeError):
    pass


class Transcriber:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def transcribe(self, filename: str, content_type: str, audio: bytes) -> str:
        if not self.settings.stt_api_key:
            raise TranscriptionError(
                "Speech-to-text is not configured. Set STT_API_KEY (and optionally STT_BASE_URL/STT_MODEL), then restart the API. Your recording was not saved."
            )
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{self.settings.stt_base_url.rstrip('/')}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.settings.stt_api_key}"},
                    data={"model": self.settings.stt_model},
                    files={"file": (filename, audio, content_type)},
                )
                response.raise_for_status()
                text = str(response.json().get("text", "")).strip()
        except httpx.HTTPStatusError as exc:
            raise TranscriptionError(
                f"The transcription provider rejected the audio ({exc.response.status_code})."
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise TranscriptionError(f"Could not transcribe the recording: {exc}") from exc
        if not text:
            raise TranscriptionError("The transcription provider returned no text.")
        return text

