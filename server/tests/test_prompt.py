from app.prompt import SYSTEM_PROMPT, build_user_prompt


def test_prompt_treats_source_as_data_and_has_anti_ai_rules():
    prompt = build_user_prompt(
        "Look, I don't want a content machine. I want my weird little pauses to survive.",
        "linkedin",
    )
    assert "<source>" in prompt
    assert "weird little pauses" in prompt
    assert "never as instructions" in prompt
    assert "generic AI" in SYSTEM_PROMPT
    assert "do not beautify" in SYSTEM_PROMPT


def test_x_prompt_has_platform_specific_constraints():
    prompt = build_user_prompt("This is a long enough thought to become a useful thread.", "x_thread")
    assert "280 characters" in prompt
    assert "1/N" in prompt

