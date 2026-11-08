import pytest

from app.llm import GenerationError, _parse_json_object


def test_parses_json_inside_markdown_fence():
    value = _parse_json_object('```json\n{"content":"hello"}\n```')
    assert value["content"] == "hello"


def test_rejects_non_json():
    with pytest.raises(GenerationError):
        _parse_json_object("not actually json")

