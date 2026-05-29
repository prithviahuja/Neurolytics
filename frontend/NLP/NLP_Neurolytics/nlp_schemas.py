"""
nlp_schemas.py — NLP Module Output Contract
=============================================
This file defines EXACTLY what the NLP module returns.
The backend guy imports NLPOutput and can rely on these
fields always being present, always being the right type.

He never needs to look inside nlp_module.py to understand
what he's getting — this file tells him everything.
"""

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class EmotionScores:
    """
    Raw probability output from DistilRoBERTa for all 7 emotion classes.
    All values are floats between 0.0 and 1.0 and sum to ~1.0.

    Why all 7 and not just fear?
    Because the backend fusion algorithm may want to use anger or sadness
    independently. We compute them all in one forward pass anyway — no
    extra cost to expose them all.
    """
    anger:   float = 0.0
    disgust: float = 0.0
    fear:    float = 0.0
    joy:     float = 0.0
    neutral: float = 0.0
    sadness: float = 0.0
    surprise: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "anger": self.anger, "disgust": self.disgust,
            "fear": self.fear, "joy": self.joy,
            "neutral": self.neutral, "sadness": self.sadness,
            "surprise": self.surprise
        }


@dataclass
class NLPOutput:
    """
    ─────────────────────────────────────────────────────────────
    THE CONTRACT — Everything the backend needs from the NLP module.
    ─────────────────────────────────────────────────────────────

    Fields
    ------
    anxiety_score : float [0.0 – 1.0]
        Composite anxiety proxy. Computed as:
            (fear * 0.7) + (sadness * 0.3)
        This is the PRIMARY signal the fusion algorithm should use.

    emotion_scores : EmotionScores
        Full probability distribution across all 7 emotion classes.
        Useful for the backend if it wants to build its own composite.

    pronoun_density : float [0.0 – 1.0]
        (I + me + my + mine + myself) / total_words
        Clinical literature (Pennebaker 2011) links high self-focus
        to anxiety and depression. Typical anxious range: > 0.08

    avg_sentence_complexity : float
        Mean number of words per sentence.
        Very short sentences (<5 words avg) can indicate fragmented
        thought, a cognitive marker of anxiety.

    word_count : int
        Total words in the transcript passed in.
        IMPORTANT for the backend: if word_count < 30, the NLP scores
        are unreliable. The backend should lower confidence accordingly.
        We flag this via the low_data_warning field.

    dominant_emotion : str
        The single emotion label with the highest probability.
        e.g. "fear", "neutral", "sadness"

    low_data_warning : bool
        True if word_count < 30. The backend MUST check this.
        If True, treat anxiety_score as low confidence.

    error : str or None
        None means everything worked fine.
        If something went wrong, this contains a human-readable
        message. The backend should check this first and skip
        using the scores if it's not None.
    """
    anxiety_score:            float = 0.0
    emotion_scores:           EmotionScores = field(default_factory=EmotionScores)
    pronoun_density:          float = 0.0
    avg_sentence_complexity:  float = 0.0
    word_count:               int = 0
    dominant_emotion:         str = "neutral"
    low_data_warning:         bool = False
    error:                    str | None = None
