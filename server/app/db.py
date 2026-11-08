from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    content_format TEXT NOT NULL,
    voice_profile TEXT NOT NULL,
    preserved_phrases TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_id INTEGER NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    value TEXT NOT NULL CHECK(value IN ('sounds_like_me', 'would_publish', 'too_ai')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(generation_id, value)
);

CREATE INDEX IF NOT EXISTS idx_feedback_generation ON feedback(generation_id);
"""


class Database:
    def __init__(self, path: Path):
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def save_generation(
        self,
        *,
        source_text: str,
        output_text: str,
        content_format: str,
        voice_profile: str,
        preserved_phrases: str,
    ) -> dict[str, Any]:
        with self.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO generations
                    (source_text, output_text, content_format, voice_profile, preserved_phrases)
                VALUES (?, ?, ?, ?, ?)
                """,
                (source_text, output_text, content_format, voice_profile, preserved_phrases),
            )
            row = connection.execute(
                "SELECT * FROM generations WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        return dict(row)

    def save_feedback(self, generation_id: int, value: str) -> dict[str, Any]:
        with self.connect() as connection:
            exists = connection.execute(
                "SELECT 1 FROM generations WHERE id = ?", (generation_id,)
            ).fetchone()
            if not exists:
                raise KeyError(generation_id)
            connection.execute(
                "INSERT OR IGNORE INTO feedback (generation_id, value) VALUES (?, ?)",
                (generation_id, value),
            )
            row = connection.execute(
                "SELECT * FROM feedback WHERE generation_id = ? AND value = ?",
                (generation_id, value),
            ).fetchone()
        return dict(row)

    def recent_feedback(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT f.id, f.generation_id, f.value, f.created_at,
                       g.content_format, g.source_text, g.output_text
                FROM feedback f
                JOIN generations g ON g.id = f.generation_id
                ORDER BY f.id DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

