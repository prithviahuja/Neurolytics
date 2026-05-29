"""
main.py — Clinical Dialogue Analyzer  |  FastAPI Backend
=========================================================
Run from the backend/ directory with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Swagger UI  : http://localhost:8000/docs
Health check: http://localhost:8000/health

Environment
───────────
Copy backend/.env.example → backend/.env and fill in HF_TOKEN before
running. The token is needed by the Pyannote diarization model.

Pipeline
────────
  Stage 1 — services.speech_diarization  : WhisperX ASR + Pyannote diarization
  Stage 2 — services.nlp_module          : DistilRoBERTa emotion / anxiety analysis
  Stage 3 — fusion                       : Multimodal score weighting → risk flag

NLPAnalyzer is initialised ONCE at module level (singleton pattern).
Loading a 500 MB model inside an endpoint would reload it on every request.
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
import time
from contextlib import asynccontextmanager

# ── Load .env FIRST — before any module that reads os.getenv ──────────────────
from dotenv import load_dotenv
load_dotenv()   # reads backend/.env (or any parent-dir .env) into os.environ

from fastapi import FastAPI, File, HTTPException, UploadFile, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Our modules ───────────────────────────────────────────────────────────────
from schemas import (
    AnalysisResponse, ErrorResponse, RiskLevel,
    NLPAnalysisResult, EmotionScoresSchema, SpeechAnalysisResult,
)
from services.speech_diarization import analyze_speech   # ← services package
from fusion import fuse_signals

# ── NLP module (services package) ─────────────────────────────────────────────
from nlp.nlp_schemas import NLPOutput


# ─────────────────────────────────────────────────────────────────────────────
#  Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt = "%H:%M:%S",
)
logger = logging.getLogger("main")


# ─────────────────────────────────────────────────────────────────────────────
#  NLPAnalyzer singleton
#  ─────────────────────────────────────────────────────────────────────────────
#  Initialise at MODULE LEVEL — NOT inside the endpoint.
#  Loading the 500 MB model on every request would be catastrophic.
#  The try/except allows the server to start even when the model is not yet
#  downloaded (e.g. CI or lightweight test environment), with a degraded fallback.
# ─────────────────────────────────────────────────────────────────────────────

_nlp_analyzer: "NLPAnalyzer | None" = None

try:
    logger.info("Loading NLPAnalyzer (DistilRoBERTa) …")
    from services.nlp_module import NLPAnalyzer   # ← services package
    _nlp_analyzer = NLPAnalyzer()
    logger.info("NLPAnalyzer ready ✓")
except Exception as _nlp_load_error:
    logger.warning(
        f"Could not load NLPAnalyzer at startup: {_nlp_load_error}\n"
        "NLP analysis will return a degraded fallback response."
    )


def _run_nlp(text: str) -> NLPOutput:
    """
    Call the NLP analyzer. Returns a degraded NLPOutput on error.
    Per integration guide: 'ALWAYS check result.error first.'
    """
    if _nlp_analyzer is None:
        return NLPOutput(error="NLPAnalyzer failed to load at startup.")
    return _nlp_analyzer.analyze(text)


# ─────────────────────────────────────────────────────────────────────────────
#  Lifespan — logs model status on start / stop
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    status_msg = "ready ✓" if _nlp_analyzer else "NOT loaded ✗ (degraded mode)"
    logger.info(f"⚡  Neurolytics starting. NLP model: {status_msg}")
    yield
    logger.info("Server shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Neurolytics",
    description = (
        "**Multimodal stress detection from doctor-patient audio recordings.**\n\n"
        "Upload a `.wav` file to `POST /api/v1/analyze-consultation` and receive "
        "a structured JSON payload containing:\n"
        "- Patient transcript and acoustic features (WhisperX)\n"
        "- Emotion scores and anxiety index (DistilRoBERTa)\n"
        "- A fused final stress risk flag (LOW / MODERATE / HIGH)\n\n"
        "NLP model: `j-hartmann/emotion-english-distilroberta-base`\n\n"
        "**Setup:** copy `backend/.env.example` → `backend/.env` and set `HF_TOKEN`."
    ),
    version     = "2.1.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a"}


def _nlp_output_to_schema(nlp: NLPOutput) -> NLPAnalysisResult:
    """Convert the NLPOutput dataclass → Pydantic NLPAnalysisResult for JSON."""
    return NLPAnalysisResult(
        anxiety_score           = nlp.anxiety_score,
        emotion_scores          = EmotionScoresSchema(
            anger    = nlp.emotion_scores.anger,
            disgust  = nlp.emotion_scores.disgust,
            fear     = nlp.emotion_scores.fear,
            joy      = nlp.emotion_scores.joy,
            neutral  = nlp.emotion_scores.neutral,
            sadness  = nlp.emotion_scores.sadness,
            surprise = nlp.emotion_scores.surprise,
        ),
        pronoun_density         = nlp.pronoun_density,
        avg_sentence_complexity = nlp.avg_sentence_complexity,
        word_count              = nlp.word_count,
        dominant_emotion        = nlp.dominant_emotion,
        low_data_warning        = nlp.low_data_warning,
        error                   = nlp.error,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check", tags=["Utility"])
async def health_check():
    return {
        "status":    "ok",
        "service":   "Neurolytics",
        "version":   "2.1.0",
        "nlp_model": "loaded" if _nlp_analyzer else "not_loaded (degraded)",
        "hf_token":  "set" if os.getenv("HF_TOKEN") else "MISSING — set in backend/.env",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Primary endpoint — full pipeline
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/analyze-consultation",
    summary        = "Analyze a clinical audio consultation",
    tags           = ["Analysis"],
    response_model = AnalysisResponse,
    responses      = {
        400: {"model": ErrorResponse, "description": "Invalid file"},
        422: {"model": ErrorResponse, "description": "Processing failed"},
        500: {"model": ErrorResponse, "description": "Internal error"},
    },
)
async def analyze_consultation(
    audio_file: UploadFile = File(
        ...,
        description="Audio recording (.wav preferred) of the doctor-patient consultation",
    ),
) -> AnalysisResponse:
    """
    **Three-stage pipeline:**

    | Stage | Module | Output |
    |-------|--------|--------|
    | 1 | services.speech_diarization (WhisperX) | Transcript, WPM, pauses |
    | 2 | services.nlp_module (DistilRoBERTa)    | Anxiety score, emotion scores |
    | 3 | fusion algorithm                       | Final stress risk flag |

    Upload a `.wav` file and receive a complete JSON analysis.
    """
    wall_start = time.perf_counter()

    # ── Validate file extension ──────────────────────────────────────────────
    filename = audio_file.filename or "upload.wav"
    _, ext   = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = f"Unsupported extension '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    tmp_path: str | None = None
    try:
        # ── Save upload ──────────────────────────────────────────────────────
        # seek(0) is critical: FastAPI's SpooledTemporaryFile cursor may be
        # mid-stream on keep-alive connections, causing a zero-byte write.
        await audio_file.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            shutil.copyfileobj(audio_file.file, tmp)
            # flush Python buffer → OS buffer, then fsync OS buffer → disk.
            # Without this on Windows, WhisperX can read stale bytes from the
            # page cache that belonged to the previous request's audio file.
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp_path = tmp.name

        file_bytes = os.path.getsize(tmp_path)
        logger.info(
            f"[API] Saved upload → {tmp_path}  ({filename})  "
            f"size={file_bytes:,} bytes"
        )
        if file_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes). Please re-upload the audio file.",
            )

        # ────────────────────────────────────────────────────────────────────
        # Stage 1 — Speech & Diarization
        # ────────────────────────────────────────────────────────────────────
        logger.info("[API] Stage 1 — Speech & Diarization …")
        try:
            speech_result = analyze_speech(tmp_path)
        except Exception as exc:
            logger.exception("[API] Speech module failed")
            raise HTTPException(
                status_code = status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail      = f"Speech module error: {exc}",
            )

        # ────────────────────────────────────────────────────────────────────
        # Stage 2 — NLP Analysis
        # ────────────────────────────────────────────────────────────────────
        logger.info("[API] Stage 2 — NLP Analysis (DistilRoBERTa) …")
        nlp_output = _run_nlp(speech_result.patient_transcript)

        if nlp_output.error:
            logger.warning(
                f"[API] NLP module returned error: {nlp_output.error}. "
                "Returning acoustic data with reduced NLP confidence."
            )
        if nlp_output.low_data_warning:
            logger.warning(
                f"[API] NLP low_data_warning — only {nlp_output.word_count} words. "
                "Scores present but confidence is low."
            )

        # ────────────────────────────────────────────────────────────────────
        # Stage 3 — Multimodal Fusion
        # ────────────────────────────────────────────────────────────────────
        logger.info("[API] Stage 3 — Multimodal Fusion …")
        fusion_result = fuse_signals(speech_result, nlp_output)

        processing_time = round(time.perf_counter() - wall_start, 3)
        logger.info(
            f"[API] ✅ Complete  risk={fusion_result.final_stress_risk}  "
            f"composite={fusion_result.composite_score}  time={processing_time}s"
        )

        # ── Convert NLP dataclass → Pydantic schema ──────────────────────────
        nlp_schema = _nlp_output_to_schema(nlp_output)

        return AnalysisResponse(
            # Top-level summary
            patient_transcript = speech_result.patient_transcript,
            speech_rate_wpm    = speech_result.speech_rate_wpm,
            nlp_anxiety_score  = nlp_output.anxiety_score,
            final_stress_risk  = fusion_result.final_stress_risk,
            composite_score    = fusion_result.composite_score,

            # Detailed module outputs
            speech_analysis    = SpeechAnalysisResult(
                patient_transcript     = speech_result.patient_transcript,
                doctor_transcript      = speech_result.doctor_transcript,
                speech_rate_wpm        = speech_result.speech_rate_wpm,
                total_patient_words    = speech_result.total_patient_words,
                patient_speaking_time  = speech_result.patient_speaking_time,
                avg_pause_duration_sec = speech_result.avg_pause_duration_sec,
                patient_speaker_id     = speech_result.patient_speaker_id,
            ),
            nlp_analysis       = nlp_schema,
            fusion             = fusion_result,

            # Metadata
            audio_filename      = filename,
            processing_time_sec = processing_time,
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ─────────────────────────────────────────────────────────────────────────────
#  Text-only NLP endpoint  (no audio — useful for testing / demos)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/analyze-text",
    summary = "NLP-only analysis of raw patient text (no audio)",
    tags    = ["Analysis"],
)
async def analyze_text(
    text: str = Query(
        ...,
        description="Patient transcript text to analyse",
        example="I feel really scared and I can't stop worrying about everything.",
    ),
) -> dict:
    """
    Run **only** Stage 2 (NLP) on a text string.
    Useful for rapid testing without an audio file.

    Example:
        `/api/v1/analyze-text?text=I+feel+really+nervous+about+my+results`
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="text parameter cannot be empty")

    nlp_output = _run_nlp(text)
    return _nlp_output_to_schema(nlp_output).model_dump()


# ─────────────────────────────────────────────────────────────────────────────
#  Global exception handler
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code = 500,
        content     = {"detail": "An unexpected internal error occurred.", "module": None},
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Dev entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
