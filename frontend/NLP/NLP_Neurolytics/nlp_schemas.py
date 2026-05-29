from dataclasses import dataclass, field
from typing import Dict

@dataclass
class EmotionScores:
    anger: float = 0.0
    disgust: float = 0.0
    fear: float = 0.0
    joy: float = 0.0
    neutral: float = 0.0
    sadness: float = 0.0
    surprise: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {'anger': self.anger, 'disgust': self.disgust, 'fear': self.fear, 'joy': self.joy, 'neutral': self.neutral, 'sadness': self.sadness, 'surprise': self.surprise}

@dataclass
class NLPOutput:
    anxiety_score: float = 0.0
    emotion_scores: EmotionScores = field(default_factory=EmotionScores)
    pronoun_density: float = 0.0
    avg_sentence_complexity: float = 0.0
    word_count: int = 0
    dominant_emotion: str = 'neutral'
    low_data_warning: bool = False
    error: str | None = None