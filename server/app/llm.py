from __future__ import annotations

import json
import re
from dataclasses import dataclass

import httpx

from .config import Settings
from .models import GenerateRequest
from .prompt import SYSTEM_PROMPT, build_user_prompt


class GenerationError(RuntimeError):
    pass


@dataclass
class GeneratedContent:
    content: str
    voice_profile: str
    preserved_phrases: list[str]


def _parse_json_object(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise GenerationError("The model returned an unreadable response.") from exc
        try:
            value = json.loads(match.group(0))
        except json.JSONDecodeError as nested:
            raise GenerationError("The model returned invalid JSON.") from nested
    if not isinstance(value, dict):
        raise GenerationError("The model response was not an object.")
    return value


class DeepSeekGenerator:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def generate(self, request: GenerateRequest) -> GeneratedContent:
        if not self.settings.deepseek_api_key:
            raise GenerationError(
                "DEEPSEEK_API_KEY is not configured. Add it to .env and restart the API."
            )
        payload = {
            "model": self.settings.deepseek_model,
            "temperature": 0.55,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_user_prompt(
                        request.source_text, request.content_format, request.voice_notes
                    ),
                },
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(
                    f"{self.settings.deepseek_base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.settings.deepseek_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                raw = response.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:300]
            raise GenerationError(
                f"DeepSeek rejected the request ({exc.response.status_code}): {detail}"
            ) from exc
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise GenerationError(f"Could not reach DeepSeek: {exc}") from exc

        parsed = _parse_json_object(raw)
        content = str(parsed.get("content", "")).strip()
        voice_profile = str(parsed.get("voice_profile", "")).strip()
        phrases = parsed.get("preserved_phrases", [])
        if not content or not voice_profile:
            raise GenerationError("The model omitted required content or voice analysis.")
        if not isinstance(phrases, list):
            phrases = []
        return GeneratedContent(
            content=content,
            voice_profile=voice_profile,
            preserved_phrases=[str(item) for item in phrases[:5] if str(item).strip()],
        )

