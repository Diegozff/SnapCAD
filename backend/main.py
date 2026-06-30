"""
SnapCAD backend — FastAPI server exposing the geometry analysis endpoint.

Run:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import base64
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from analyzer import AnalyzeError, analyze_image

load_dotenv()

app = FastAPI(title="SnapCAD API", version="1.0.0")

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Accepted image types -> the media_type string Anthropic expects.
ALLOWED_TYPES = {
    "image/png": "image/png",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": os.getenv("SNAPCAD_MODEL", "claude-opus-4-8")}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
    # --- Validation: must be a supported image -----------------------------
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Formato no soportado. Sube una imagen PNG, JPG, WEBP o GIF."
            ),
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="La imagen supera el límite de 10 MB.",
        )

    image_b64 = base64.standard_b64encode(raw).decode("utf-8")

    # --- AI analysis -------------------------------------------------------
    try:
        geometry = analyze_image(image_b64, ALLOWED_TYPES[content_type])
    except AnalyzeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:  # missing API key
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return geometry
