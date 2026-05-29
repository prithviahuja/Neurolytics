"""
services/nlp_module.py — NLP Sentiment & Linguistic Analysis
=============================================================
WHAT THIS MODULE DOES
─────────────────────
Takes a plain text string (the patient's transcript, already extracted
and isolated by the Speech module) and returns an NLPOutput object.

Three analyses run on that text:
  1. Emotion Classification  — DistilRoBERTa transformer model
  2. Pronoun Density         — regex-based self-reference counting
  3. Sentence Complexity     — average words per sentence

PUBLIC INTERFACE (this is all the backend needs to know)
────────────────────────────────────────────────────────
    from services.nlp_module import NLPAnalyzer

    analyzer = NLPAnalyzer()          # Do this ONCE at app startup
    result = analyzer.analyze(text)   # Call this per request
    # result is an NLPOutput dataclass — see ml_models/nlp_schemas.py

WHY DISTILROBERTA SPECIFICALLY
───────────────────────────────
Options considered:
  - BERT-base: accurate but 110M params, slow on CPU, overkill
  - DistilBERT: faster but not fine-tuned on emotion data
  - j-hartmann/emotion-english-distilroberta-base: 66M params,
    fine-tuned on 6 emotion datasets (GoEmotions, SemEval, etc.),
    outputs exactly the 7 classes we need, runs in ~200ms on CPU.
  This is the right trade-off for a clinical MVP.

CHUNKING STRATEGY
──────────────────
RoBERTa has a 512-token hard limit. Long patient transcripts will
exceed this. Instead of truncating (which loses information), we
split the transcript into overlapping chunks, run the model on each,
and average the probability distributions. This is standard practice
for document-level classification with transformer models.
"""

import re
import warnings
from typing import List

# Suppress HuggingFace progress bars in production
warnings.filterwarnings("ignore")

from transformers import pipeline

from ml_models.nlp_schemas import NLPOutput, EmotionScores


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

# Tokens per chunk fed to the model. 512 is the hard limit,
# we use 450 to leave room for special tokens ([CLS], [SEP]).
CHUNK_SIZE_TOKENS = 450

# Overlap between consecutive chunks (in words, approximated).
# Overlap prevents losing emotional context at chunk boundaries.
CHUNK_OVERLAP_WORDS = 30

# Self-referential pronouns that signal high self-focus
SELF_PRONOUNS = {"i", "me", "my", "mine", "myself"}

# Minimum word count for reliable NLP scoring
MIN_RELIABLE_WORD_COUNT = 30

# Weights for composing anxiety score from emotion labels
FEAR_WEIGHT    = 0.7
SADNESS_WEIGHT = 0.3


# ─────────────────────────────────────────────────────────────
# NLPAnalyzer Class
# ─────────────────────────────────────────────────────────────

class NLPAnalyzer:
    """
    The main NLP analysis class.

    Design decision — why a class instead of a plain function?
    ───────────────────────────────────────────────────────────
    Loading a transformer model takes ~3–5 seconds and ~500MB RAM.
    If we loaded it inside a function, it would reload on EVERY request.
    By putting it in a class, the backend initializes it ONCE at
    server startup and reuses the same loaded model for all requests.
    This is called the "singleton pattern" in backend engineering.

    Usage:
        # In main.py (backend), at the TOP of the file (not inside endpoint):
        analyzer = NLPAnalyzer()

        # Inside the /analyze endpoint:
        result = analyzer.analyze(patient_transcript)
    """

    def __init__(self, model_name: str = MODEL_NAME, device: int = -1):
        """
        Load the emotion classification model.

        Parameters
        ----------
        model_name : str
            HuggingFace model identifier. Default is DistilRoBERTa emotion.
        device : int
            -1 = CPU (default, works everywhere)
             0 = first GPU (if your machine has CUDA)

        Why CPU by default?
            Most coursework machines don't have GPUs. CPU inference
            with DistilRoBERTa takes ~200ms per chunk — acceptable for
            a clinical tool that isn't doing real-time processing.
        """
        print(f"[NLPAnalyzer] Loading model: {model_name}")
        print(f"[NLPAnalyzer] Device: {'CPU' if device == -1 else f'GPU:{device}'}")

        self.classifier = pipeline(
            task="text-classification",
            model=model_name,
            return_all_scores=True,   # We want probabilities for ALL 7 classes
            device=device
        )

        self.model_name = model_name
        print("[NLPAnalyzer] Model loaded successfully ✓")

    def analyze(self, text: str) -> NLPOutput:
        """
        ─────────────────────────────────────────────────────
        THE MAIN PUBLIC METHOD — This is all the backend calls.
        ─────────────────────────────────────────────────────

        Parameters
        ----------
        text : str
            The patient's transcript text. This should already be
            isolated to ONLY the patient's words (speaker diarization
            is the speech module's job, not ours).

        Returns
        -------
        NLPOutput
            See ml_models/nlp_schemas.py for full field documentation.
            Always check result.error first — if it's not None,
            the scores are not reliable.
        """
        # ── Guard: empty input ────────────────────────────────
        if not text or not text.strip():
            return NLPOutput(
                error="Empty transcript provided. Cannot perform NLP analysis."
            )

        try:
            # ── Step A: Emotion Classification ───────────────
            emotion_scores = self._classify_emotions(text)

            # ── Step B: Pronoun Density ───────────────────────
            pronoun_density = self._compute_pronoun_density(text)

            # ── Step C: Sentence Complexity ───────────────────
            avg_complexity = self._compute_sentence_complexity(text)

            # ── Step D: Word Count ────────────────────────────
            word_count = len(text.split())

            # ── Step E: Anxiety Score (composite) ────────────
            anxiety_score = (
                (emotion_scores.fear    * FEAR_WEIGHT) +
                (emotion_scores.sadness * SADNESS_WEIGHT)
            )
            anxiety_score = round(min(anxiety_score, 1.0), 4)

            # ── Step F: Dominant Emotion ──────────────────────
            dominant_emotion = self._get_dominant_emotion(emotion_scores)

            # ── Step G: Low Data Warning ──────────────────────
            low_data_warning = word_count < MIN_RELIABLE_WORD_COUNT

            return NLPOutput(
                anxiety_score=anxiety_score,
                emotion_scores=emotion_scores,
                pronoun_density=round(pronoun_density, 4),
                avg_sentence_complexity=round(avg_complexity, 2),
                word_count=word_count,
                dominant_emotion=dominant_emotion,
                low_data_warning=low_data_warning,
                error=None
            )

        except Exception as e:
            # Never crash the backend — return a structured error
            return NLPOutput(
                error=f"NLP analysis failed: {str(e)}"
            )

    # ─────────────────────────────────────────────────────────
    # Private Methods — Internal Implementation Details
    # The backend doesn't need to call any of these directly.
    # ─────────────────────────────────────────────────────────

    def _classify_emotions(self, text: str) -> EmotionScores:
        """
        Run the transformer emotion classifier with chunking.

        CHUNKING EXPLAINED
        ──────────────────
        The model has a 512-token limit. A clinical transcript of
        5 minutes of speech is ~700–900 words = ~1000 tokens.
        That exceeds the limit.

        Our solution:
          1. Split text into word-level chunks of ~450 words each
          2. Each chunk overlaps the previous by 30 words so we
             don't lose emotional context at boundaries
          3. Run the model on each chunk independently
          4. Average the probability distributions across all chunks
        """
        chunks = self._chunk_text(text)

        all_scores = []
        for chunk in chunks:
            if not chunk.strip():
                continue
            # The pipeline returns: [[{label: x, score: y}, ...]]
            result = self.classifier(chunk)
            chunk_scores = {item["label"]: item["score"] for item in result[0]}
            all_scores.append(chunk_scores)

        if not all_scores:
            return EmotionScores()  # All zeros — safe default

        # Average across chunks
        averaged = {}
        for emotion in all_scores[0].keys():
            averaged[emotion] = sum(d[emotion] for d in all_scores) / len(all_scores)

        return EmotionScores(
            anger=   round(averaged.get("anger",   0.0), 4),
            disgust= round(averaged.get("disgust", 0.0), 4),
            fear=    round(averaged.get("fear",    0.0), 4),
            joy=     round(averaged.get("joy",     0.0), 4),
            neutral= round(averaged.get("neutral", 0.0), 4),
            sadness= round(averaged.get("sadness", 0.0), 4),
            surprise=round(averaged.get("surprise",0.0), 4),
        )

    def _chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping word-level chunks.

        We use words (not tokens) for splitting because tokenization
        is model-specific. 450 words ≈ 600 tokens for English text,
        which safely fits in the 512-token limit with room for
        special tokens.
        """
        words = text.split()
        if len(words) <= CHUNK_SIZE_TOKENS:
            return [text]  # No chunking needed

        chunks = []
        start = 0
        while start < len(words):
            end = start + CHUNK_SIZE_TOKENS
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            start += (CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_WORDS)

        return chunks

    def _compute_pronoun_density(self, text: str) -> float:
        """
        Compute self-referential pronoun density.

        Formula: count(I, me, my, mine, myself) / total_words

        Clinical basis:
            Pennebaker & Chung (2011) found that depressed and
            anxious individuals use significantly more first-person
            singular pronouns, reflecting heightened self-focus.
            Typical anxious range: density > 0.08 (8% of words)
        """
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.0

        pronoun_count = sum(1 for w in words if w in SELF_PRONOUNS)
        return pronoun_count / len(words)

    def _compute_sentence_complexity(self, text: str) -> float:
        """
        Compute average words per sentence.

        Fragmented speech (avg < 5 words) can indicate cognitive
        disruption. Run-on sentences (avg > 25) can indicate
        pressured, disorganized speech.
        """
        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0

        word_counts = [len(s.split()) for s in sentences]
        return sum(word_counts) / len(word_counts)

    def _get_dominant_emotion(self, scores: EmotionScores) -> str:
        """Return the label with the highest probability."""
        emotion_dict = scores.to_dict()
        return max(emotion_dict, key=emotion_dict.get)
