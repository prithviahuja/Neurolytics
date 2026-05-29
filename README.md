# Clinical Dialogue Analyzer — Backend v2

Multimodal stress detection from doctor-patient audio recordings.
NLP module provided by **NLP_Neurolytics** (DistilRoBERTa, unchanged).

---

## Project Structure

```
clinical_analyzer/
├── main.py              ← FastAPI app — routes, NLPAnalyzer singleton, pipeline
├── speech_module.py     ← WhisperX transcription, diarization, WPM calc
├── fusion.py            ← Multimodal fusion algorithm
├── schemas.py           ← Pydantic API data contracts
├── requirements.txt     ← Dependencies (versions locked to NLP team's spec)
│
└── nlp/                 ← NLP module — DistilRoBERTa emotion analyzer
    ├── __init__.py
    ├── nlp_module.py    ← NLPAnalyzer class (DistilRoBERTa)
    └── nlp_schemas.py   ← NLPOutput + EmotionScores dataclasses
```

---

## Setup

```bash
# 1. Create and activate virtual environment
python -m venv env
source env/bin/activate        # Windows: env\Scripts\activate

# 2. Install all dependencies
pip install -r requirements.txt

# 3. Install WhisperX (speech diarization — install after torch)
pip install git+https://github.com/m-bain/whisperx.git
```

### HuggingFace Token (required for speaker diarization)

WhisperX uses pyannote.audio which requires accepting terms and a token:

1. Accept terms at https://huggingface.co/pyannote/speaker-diarization-3.1
2. Generate a token at https://huggingface.co/settings/tokens
3. Set it in `speech_module.py`:
   ```python
   HF_TOKEN = "hf_your_token_here"
   ```

The NLP model (`j-hartmann/emotion-english-distilroberta-base`) downloads
automatically on first run — about 300 MB.

---

## Running the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI:    http://localhost:8000/docs
- Health check:  http://localhost:8000/health

---

## Testing without audio

```bash
# Quick NLP-only test
curl "http://localhost:8000/api/v1/analyze-text?text=I+feel+terrified+and+I+can't+stop+worrying"
```

---

## Full Audio Test

Via Swagger UI → `POST /api/v1/analyze-consultation` → upload your `.wav`.

Or via curl:
```bash
curl -X POST "http://localhost:8000/api/v1/analyze-consultation" \
     -F "audio_file=@consultation.wav"
```

---

## Response Structure

```json
{
  "patient_transcript":  "I feel very scared, I can't sleep...",
  "speech_rate_wpm":     174.2,
  "nlp_anxiety_score":   0.713,
  "final_stress_risk":   "HIGH",
  "composite_score":     0.672,

  "speech_analysis": {
    "patient_speaker_id":     "SPEAKER_01",
    "total_patient_words":    152,
    "patient_speaking_time":  52.4,
    "avg_pause_duration_sec": 1.8
  },

  "nlp_analysis": {
    "anxiety_score":           0.713,
    "dominant_emotion":        "fear",
    "emotion_scores": {
      "fear": 0.812, "sadness": 0.541, "anger": 0.032,
      "joy": 0.011, "neutral": 0.044, "disgust": 0.018, "surprise": 0.021
    },
    "pronoun_density":          0.112,
    "avg_sentence_complexity":  4.8,
    "word_count":               152,
    "low_data_warning":         false,
    "error":                    null
  },

  "fusion": {
    "final_stress_risk":  "HIGH",
    "composite_score":    0.672,
    "acoustic_score":     0.410,
    "nlp_score":          0.593,
    "nlp_confidence":     "full",
    "reasoning":          "Risk Level: HIGH  Composite Score: 0.672 ..."
  }
}
```

---

## Fusion Logic

### NLP sub-score (exact formula from NLP_Neurolytics INTEGRATION_GUIDE)

```
anxiety_component  = nlp.anxiety_score               # (fear × 0.7) + (sadness × 0.3)
pronoun_component  = min(nlp.pronoun_density / 0.15, 1.0)
nlp_score          = (anxiety_component × 0.80) + (pronoun_component × 0.20)
```

### Composite score

```
composite = (0.40 × acoustic_score) + (0.60 × nlp_score) + penalties
```

### Risk thresholds

| Condition | Risk |
|-----------|------|
| WPM > 160 AND anxiety_score > 0.60 | **HIGH** (hard override) |
| composite ≥ 0.60 | **HIGH** |
| composite ≥ 0.35 | **MODERATE** |
| composite < 0.35 | **LOW** |

### Co-occurrence penalties

| Flag | +Score |
|------|--------|
| Fast speech + NLP anxiety | +0.10 |
| Very slow speech (< 90 WPM) | +0.08 |
| Long pauses (avg > 2 s) | +0.07 |
| Pronoun density > 0.08 | +0.05 |
| Fragmented sentences (avg < 4 words) | +0.05 |

---

## Key Design Decisions

**`NLPAnalyzer` as singleton** — The NLP team's `INTEGRATION_GUIDE.py` explicitly
requires this: the 500 MB model is loaded once at module level in `main.py`, not
inside the endpoint. Every request reuses the same loaded instance.

**Error-first NLP handling** — Per the integration guide, `nlp_result.error` is
checked before any score is used. If the NLP module fails, the fusion algorithm
falls back to a neutral 0.5 score so acoustic analysis can still proceed.

**`nlp/` module** — `nlp_module.py` and `nlp_schemas.py` contain the NLP
team's deliverable and must not be modified. All adaptation happens at the
boundary in `main.py` (the `_nlp_output_to_schema()` converter).
