"""Run one real generation → feedback → SQLite verification cycle.

This script calls the configured model. It never substitutes fixture content.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.main import app


SOURCE = (
    "Okay, here's the thing I keep coming back to: productivity advice is weirdly "
    "obsessed with squeezing more out of a day. I don't need twelve optimized hours. "
    "I need, like, two honest hours where my brain isn't negotiating with six tabs and "
    "a blinking phone. Maybe the goal isn't doing more. Maybe it's making the good hours "
    "less crowded."
)


def main() -> None:
    with TestClient(app) as client:
        generated = client.post(
            "/api/generate",
            json={"source_text": SOURCE, "content_format": "linkedin", "voice_notes": ""},
        )
        if generated.status_code != 200:
            raise SystemExit(f"Generation failed: {generated.status_code} {generated.text}")
        result = generated.json()

        feedback = client.post(
            "/api/feedback",
            json={"generation_id": result["id"], "value": "sounds_like_me"},
        )
        if feedback.status_code != 201:
            raise SystemExit(f"Feedback failed: {feedback.status_code} {feedback.text}")

    with sqlite3.connect(settings.database_path) as connection:
        row = connection.execute(
            """
            SELECT g.id, g.content_format, f.value
            FROM generations g JOIN feedback f ON f.generation_id = g.id
            WHERE g.id = ?
            """,
            (result["id"],),
        ).fetchone()

    print(
        json.dumps(
            {
                "generation_id": result["id"],
                "format": result["content_format"],
                "voice_profile": result["voice_profile"],
                "preserved_phrases": result["preserved_phrases"],
                "content": result["content"],
                "sqlite_verification": row,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
