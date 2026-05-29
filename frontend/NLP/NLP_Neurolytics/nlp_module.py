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
            result = self.classifier(chunk)
            chunk_scores = {item['label']: item['score'] for item in result[0]}
            all_scores.append(chunk_scores)
        if not all_scores:
            return EmotionScores()
        averaged = {}
        for emotion in all_scores[0].keys():
            averaged[emotion] = sum((d[emotion] for d in all_scores)) / len(all_scores)
        return EmotionScores(anger=round(averaged.get('anger', 0.0), 4), disgust=round(averaged.get('disgust', 0.0), 4), fear=round(averaged.get('fear', 0.0), 4), joy=round(averaged.get('joy', 0.0), 4), neutral=round(averaged.get('neutral', 0.0), 4), sadness=round(averaged.get('sadness', 0.0), 4), surprise=round(averaged.get('surprise', 0.0), 4))

    def _chunk_text(self, text: str) -> List[str]:
        words = text.split()
        if len(words) <= CHUNK_SIZE_TOKENS:
            return [text]
        chunks = []
        start = 0
        while start < len(words):
            end = start + CHUNK_SIZE_TOKENS
            chunk = ' '.join(words[start:end])
            chunks.append(chunk)
            start += CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_WORDS
        return chunks

    def _compute_pronoun_density(self, text: str) -> float:
        words = re.findall('\\b\\w+\\b', text.lower())
        if not words:
            return 0.0
        pronoun_count = sum((1 for w in words if w in SELF_PRONOUNS))
        return pronoun_count / len(words)

    def _compute_sentence_complexity(self, text: str) -> float:
        sentences = re.split('[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return 0.0
        word_counts = [len(s.split()) for s in sentences]
        return sum(word_counts) / len(word_counts)

    def _get_dominant_emotion(self, scores: EmotionScores) -> str:
        emotion_dict = scores.to_dict()
        return max(emotion_dict, key=emotion_dict.get)