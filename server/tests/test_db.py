from pathlib import Path

import pytest

from app.db import Database


def test_generation_and_feedback_are_persisted(tmp_path: Path):
    database = Database(tmp_path / "test.db")
    database.initialize()
    generation = database.save_generation(
        source_text="raw and opinionated",
        output_text="publishable but still opinionated",
        content_format="linkedin",
        voice_profile="blunt, compact",
        preserved_phrases='["opinionated"]',
    )
    feedback = database.save_feedback(generation["id"], "sounds_like_me")
    assert feedback["generation_id"] == generation["id"]
    assert database.recent_feedback()[0]["value"] == "sounds_like_me"


def test_feedback_requires_a_real_generation(tmp_path: Path):
    database = Database(tmp_path / "test.db")
    database.initialize()
    with pytest.raises(KeyError):
        database.save_feedback(999, "too_ai")

