"""
schemas.py — API Data Contracts  (Pydantic v2)
===============================================
These Pydantic models are the serialisation layer for the FastAPI response.
They mirror the NLP team's dataclasses (NLPOutput / EmotionScores) so that
their fields map 1-to-1 into the JSON response without any renaming.

Import map
──────────
  NLP team's dataclasses  →  used internally inside the app
  Pydantic models here    →  used at the API boundary (request / response)
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


# ─────────────────────────────────────────────────────────────────────────────
#  Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW      = "LOW"
    MODERATE = "MODERATE"
    HIGH     = "HIGH"


# ─────────────────────────────────────────────────────────────────────────────
#  Speech Module output schema
# ─────────────────────────────────────────────────────────────────────────────

class SpeechAnalysisResult(BaseModel):
    """Acoustic features produced by the Speech & Diarization module."""
    patient_transcript:     str   = Field(..., description="Concatenated patient speech text")
    doctor_transcript:      str   = Field(..., description="Concatenated doctor speech text")
    speech_rate_wpm:        float = Field(..., description="Patient words per minute")
    total_patient_words:    int
    patient_speaking_time:  float = Field(..., description="Total patient speaking time in seconds")
    avg_pause_duration_sec: float = Field(..., description="Average inter-word pause in seconds")
    patient_speaker_id:     str   = Field(..., description="Auto-detected patient speaker label")


# ─────────────────────────────────────────────────────────────────────────────
#  NLP Module output schema
#  — mirrors the NLP team's EmotionScores + NLPOutput dataclasses exactly
# ─────────────────────────────────────────────────────────────────────────────

class EmotionScoresSchema(BaseModel):
    """
    Raw probability distribution across all 7 DistilRoBERTa emotion classes.
    Mirrors ml_models.nlp_schemas.EmotionScores exactly.
    Values are floats in [0.0, 1.0] and sum to ~1.0.
    """
    anger:    float = Field(0.0, ge=0.0, le=1.0)
    disgust:  float = Field(0.0, ge=0.0, le=1.0)
    fear:     float = Field(0.0, ge=0.0, le=1.0)
    joy:      float = Field(0.0, ge=0.0, le=1.0)
    neutral:  float = Field(0.0, ge=0.0, le=1.0)
    sadness:  float = Field(0.0, ge=0.0, le=1.0)
    surprise: float = Field(0.0, ge=0.0, le=1.0)


class NLPAnalysisResult(BaseModel):
    """
    Output of the NLP module — mirrors ml_models.nlp_schemas.NLPOutput exactly.

    Fields
    ------
    anxiety_score          — composite: (fear×0.7) + (sadness×0.3)  [PRIMARY signal]
    emotion_scores         — full 7-class probability distribution
    pronoun_density        — (I+me+my+mine+myself) / total_words
    avg_sentence_complexity— mean words per sentence
    word_count             — total words analysed
    dominant_emotion       — label with highest probability
    low_data_warning       — True when word_count < 30 (scores unreliable)
    error                  — None on success; message string on failure
    """
    anxiety_score:              float               = Field(0.0, ge=0.0, le=1.0)
    emotion_scores:             EmotionScoresSchema = Field(default_factory=EmotionScoresSchema)
    pronoun_density:            float               = Field(0.0, ge=0.0)
    avg_sentence_complexity:    float               = Field(0.0, ge=0.0)
    word_count:                 int                 = 0
    dominant_emotion:           str                 = "neutral"
    low_data_warning:           bool                = False
    error:                      Optional[str]       = None


# ─────────────────────────────────────────────────────────────────────────────
#  Fusion output schema
# ─────────────────────────────────────────────────────────────────────────────

class FusionResult(BaseModel):
    """Multimodal fusion of acoustic + linguistic signals into a risk flag."""
    final_stress_risk:   RiskLevel = Field(..., description="LOW / MODERATE / HIGH")
    composite_score:     float     = Field(..., ge=0.0, le=1.0,
                                           description="Weighted composite stress score")
    acoustic_score:      float     = Field(..., ge=0.0, le=1.0,
                                           description="Normalised acoustic sub-score")
    nlp_score:           float     = Field(..., ge=0.0, le=1.0,
                                           description="Normalised NLP sub-score (anxiety + pronoun)")
    acoustic_weight:     float     = 0.40
    linguistic_weight:   float     = 0.60
    nlp_confidence:      str       = Field(..., description="'full' or 'low_data' (word count < 30)")
    reasoning:           str       = Field(..., description="Human-readable clinical explanation")


# ─────────────────────────────────────────────────────────────────────────────
#  Top-level API response
# ─────────────────────────────────────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    """
    Complete response returned by POST /api/v1/analyze-consultation.
    Bundles every module's output plus the fused risk result.
    """
    # ── Summary fields (quick access at top level) ────────────────────────
    patient_transcript:  str
    speech_rate_wpm:     float
    nlp_anxiety_score:   float       = Field(..., description="From NLP module: (fear×0.7)+(sadness×0.3)")
    final_stress_risk:   RiskLevel
    composite_score:     float

    # ── Detailed module outputs ───────────────────────────────────────────
    speech_analysis:     SpeechAnalysisResult
    nlp_analysis:        NLPAnalysisResult
    fusion:              FusionResult

    # ── Metadata ──────────────────────────────────────────────────────────
    audio_filename:       str
    processing_time_sec:  float

    class Config:
        use_enum_values = True


# ─────────────────────────────────────────────────────────────────────────────
#  Error schema
# ─────────────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
    module: Optional[str] = None
