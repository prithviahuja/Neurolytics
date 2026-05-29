from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum

class RiskLevel(str, Enum):
    LOW = 'LOW'
    MODERATE = 'MODERATE'
    HIGH = 'HIGH'

class SpeechAnalysisResult(BaseModel):
    patient_transcript: str = Field(..., description='Concatenated patient speech text')
    doctor_transcript: str = Field(..., description='Concatenated doctor speech text')
    speech_rate_wpm: float = Field(..., description='Patient words per minute')
    total_patient_words: int
    patient_speaking_time: float = Field(..., description='Total patient speaking time in seconds')
    avg_pause_duration_sec: float = Field(..., description='Average inter-word pause in seconds')
    patient_speaker_id: str = Field(..., description='Auto-detected patient speaker label')

class EmotionScoresSchema(BaseModel):
    anger: float = Field(0.0, ge=0.0, le=1.0)
    disgust: float = Field(0.0, ge=0.0, le=1.0)
    fear: float = Field(0.0, ge=0.0, le=1.0)
    joy: float = Field(0.0, ge=0.0, le=1.0)
    neutral: float = Field(0.0, ge=0.0, le=1.0)
    sadness: float = Field(0.0, ge=0.0, le=1.0)
    surprise: float = Field(0.0, ge=0.0, le=1.0)

class NLPAnalysisResult(BaseModel):
    anxiety_score: float = Field(0.0, ge=0.0, le=1.0)
    emotion_scores: EmotionScoresSchema = Field(default_factory=EmotionScoresSchema)
    pronoun_density: float = Field(0.0, ge=0.0)
    avg_sentence_complexity: float = Field(0.0, ge=0.0)
    word_count: int = 0
    dominant_emotion: str = 'neutral'
    low_data_warning: bool = False
    error: Optional[str] = None

class FusionResult(BaseModel):
    final_stress_risk: RiskLevel = Field(..., description='LOW / MODERATE / HIGH')
    composite_score: float = Field(..., ge=0.0, le=1.0, description='Weighted composite stress score')
    acoustic_score: float = Field(..., ge=0.0, le=1.0, description='Normalised acoustic sub-score')
    nlp_score: float = Field(..., ge=0.0, le=1.0, description='Normalised NLP sub-score (anxiety + pronoun)')
    acoustic_weight: float = 0.4
    linguistic_weight: float = 0.6
    nlp_confidence: str = Field(..., description="'full' or 'low_data' (word count < 30)")
    reasoning: str = Field(..., description='Human-readable clinical explanation')

class AnalysisResponse(BaseModel):
    patient_transcript: str
    speech_rate_wpm: float
    nlp_anxiety_score: float = Field(..., description='From NLP module: (fear×0.7)+(sadness×0.3)')
    final_stress_risk: RiskLevel
    composite_score: float
    speech_analysis: SpeechAnalysisResult
    nlp_analysis: NLPAnalysisResult
    fusion: FusionResult
    audio_filename: str
    processing_time_sec: float

    class Config:
        use_enum_values = True

class ErrorResponse(BaseModel):
    detail: str
    module: Optional[str] = None