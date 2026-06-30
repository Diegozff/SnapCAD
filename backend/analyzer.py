"""
Anthropic vision call: photo -> structured geometry JSON.

Uses the official `anthropic` SDK with structured outputs (output_config.format)
so the response is guaranteed to be schema-valid JSON, eliminating the
"unparseable model output" failure class.
"""
from __future__ import annotations

import json
import os

import anthropic

from prompt import GEOMETRY_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION

# Vision-capable, most-capable current model. Swap here if needed.
MODEL = os.getenv("SNAPCAD_MODEL", "claude-opus-4-8")

# Created lazily so importing this module never requires the key to be set.
_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to "
                "backend/.env and add your key."
            )
        # Generous timeout: vision + adaptive thinking can take a while.
        _client = anthropic.Anthropic(timeout=180.0)
    return _client


class AnalyzeError(Exception):
    """Raised when the model call fails or returns unusable data."""


def analyze_image(image_b64: str, media_type: str) -> dict:
    """Send the image to Claude and return the parsed geometry dict.

    Args:
        image_b64: Base64-encoded image bytes (no data: prefix, no newlines).
        media_type: e.g. "image/png", "image/jpeg", "image/webp".
    """
    client = _get_client()

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            thinking={"type": "adaptive"},
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": GEOMETRY_SCHEMA,
                },
                "effort": "high",
            },
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": USER_INSTRUCTION},
                    ],
                }
            ],
        )
    except anthropic.APIError as exc:  # network / auth / rate limit / 5xx
        raise AnalyzeError(f"Anthropic API error: {exc}") from exc

    if response.stop_reason == "refusal":
        raise AnalyzeError("The model declined to analyze this image.")

    # With output_config.format the first text block is schema-valid JSON.
    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        raise AnalyzeError("The model returned no analyzable content.")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AnalyzeError(f"Model output was not valid JSON: {exc}") from exc

    return _validate(data)


def _validate(data: dict) -> dict:
    """Lightweight structural validation + sane defaults."""
    if not isinstance(data, dict):
        raise AnalyzeError("Model output was not a JSON object.")

    entities = data.get("entities")
    dimensions = data.get("dimensions")
    if not isinstance(entities, list) or not isinstance(dimensions, list):
        raise AnalyzeError("Model output is missing entities/dimensions arrays.")
    if not entities:
        raise AnalyzeError("No geometry was detected in this image.")

    data.setdefault("image_width", 1000)
    data.setdefault("image_height", 1000)
    data.setdefault("part_name", "Pieza")
    data.setdefault("view", "front")
    data.setdefault("confidence", 0.0)
    return data
