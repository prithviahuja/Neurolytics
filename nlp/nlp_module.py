import re
import warnings
from typing import List
warnings.filterwarnings('ignore')
from transformers import pipeline
from nlp.nlp_schemas import NLPOutput, EmotionScores
MODEL_NAME = 'j-hartmann/emotion-english-distilroberta-base'
CHUNK_SIZE_TOKENS = 450
CHUNK_OVERLAP_WORDS = 30
SELF_PRONOUNS = {'i', 'me', 'my', 'mine', 'myself'}
MIN_RELIABLE_WORD_COUNT = 30
FEAR_WEIGHT = 0.7
SADNESS_WEIGHT = 0.3

class NLPAnalyzer:

    def __init__(self, model_name: str=MODEL_NAME, device: int=-1):
        print(f'[NLPAnalyzer] Loading model: {model_name}')
        print(f'[NLPAnalyzer] Device: {('CPU' if device == -1 else f'GPU:{device}')}')
        self.classifier = pipeline(task='text-classification', model=model_name, return_all_scores=True, device=device)
        self.model_name = model_name
        print(f'[NLPAnalyzer] Model loaded successfully ✓')

    def analyze(self, text: str) -> NLPOutput:
        if not text or not text.strip():
            return NLPOutput(error='Empty transcript provided. Cannot perform NLP analysis.')
        try:
            emotion_scores = self._classify_emotions(text)
            pronoun_density = self._compute_pronoun_density(text)
            avg_complexity = self._compute_sentence_complexity(text)
            word_count = len(text.split())
            anxiety_score = emotion_scores.fear * FEAR_WEIGHT + emotion_scores.sadness * SADNESS_WEIGHT
            anxiety_score = round(min(anxiety_score, 1.0), 4)
            dominant_emotion = self._get_dominant_emotion(emotion_scores)
            low_data_warning = word_count < MIN_RELIABLE_WORD_COUNT
            return NLPOutput(anxiety_score=anxiety_score, emotion_scores=emotion_scores, pronoun_density=round(pronoun_density, 4), avg_sentence_complexity=round(avg_complexity, 2), word_count=word_count, dominant_emotion=dominant_emotion, low_data_warning=low_data_warning, error=None)
        except Exception as e:
            return NLPOutput(error=f'NLP analysis failed: {str(e)}')

    def _classify_emotions(self, text: str) -> EmotionScores:
        chunks = self._chunk_text(text)
        all_scores = []
        for chunk in chunks:
            if not chunk.strip():
                continue
            out = self.classifier(chunk)
            scores = {d['label'].lower(): d['score'] for d in out[0]}
            es = EmotionScores(anger=scores.get('anger', 0.0), disgust=scores.get('disgust', 0.0), fear=scores.get('fear', 0.0), joy=scores.get('joy', 0.0), neutral=scores.get('neutral', 0.0), sadness=scores.get('sadness', 0.0), surprise=scores.get('surprise', 0.0))
            all_scores.append(es)
        if not all_scores:
            return EmotionScores()
        n = len(all_scores)
        avg = EmotionScores(anger=sum((s.anger for s in all_scores)) / n, disgust=sum((s.disgust for s in all_scores)) / n, fear=sum((s.fear for s in all_scores)) / n, joy=sum((s.joy for s in all_scores)) / n, neutral=sum((s.neutral for s in all_scores)) / n, sadness=sum((s.sadness for s in all_scores)) / n, surprise=sum((s.surprise for s in all_scores)) / n)
        return avg

    def _chunk_text(self, text: str) -> List[str]:
        words = text.split()
        if len(words) <= CHUNK_SIZE_TOKENS:
            return [text]
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i + CHUNK_SIZE_TOKENS]
            chunks.append(' '.join(chunk_words))
            i += CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_WORDS
        return chunks

    def _compute_pronoun_density(self, text: str) -> float:
        words = [w.lower().strip('.,!?;:') for w in text.split()]
        if not words:
            return 0.0
        count = sum((1 for w in words if w in SELF_PRONOUNS))
        return count / len(words)

    def _compute_sentence_complexity(self, text: str) -> float:
        sentences = re.split('[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return 0.0
        return sum((len(s.split()) for s in sentences)) / len(sentences)

    def _get_dominant_emotion(self, emotion_scores: EmotionScores) -> str:
        mapping = emotion_scores.to_dict()
        return max(mapping, key=mapping.get)