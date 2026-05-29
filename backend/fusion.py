from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import List
from nlp.nlp_schemas import NLPOutput
from schemas import FusionResult, RiskLevel, SpeechAnalysisResult
logger = logging.getLogger(__name__)
ACOUSTIC_WEIGHT = 0.4
LINGUISTIC_WEIGHT = 0.6
ANXIETY_COMPONENT_WEIGHT = 0.8
PRONOUN_COMPONENT_WEIGHT = 0.2
MAX_PRONOUN_DENSITY = 0.15
WPM_HIGH = 160
WPM_LOW = 90
PAUSE_LONG_SEC = 2.0
ACOUSTIC_MID_LOW = 100.0
ACOUSTIC_MID_HIGH = 150.0
COMPOSITE_HIGH_THRESHOLD = 0.6
COMPOSITE_MODERATE_THRESHOLD = 0.35
NLP_HIGH_THRESHOLD = 0.6

@dataclass
class _Penalty:
    description: str
    amount: float

def _evaluate_penalties(speech: SpeechAnalysisResult, nlp: NLPOutput) -> List[_Penalty]:
    penalties: List[_Penalty] = []
    if speech.speech_rate_wpm > WPM_HIGH and nlp.anxiety_score > 0.35:
        penalties.append(_Penalty('Rapid speech rate combined with elevated NLP anxiety', 0.1))
    if 0 < speech.speech_rate_wpm < WPM_LOW:
        penalties.append(_Penalty('Unusually slow speech rate (< 90 WPM) — possible withdrawal', 0.08))
    if speech.avg_pause_duration_sec > PAUSE_LONG_SEC:
        penalties.append(_Penalty('Frequent long pauses — hesitation marker', 0.07))
    if nlp.pronoun_density > 0.08:
        penalties.append(_Penalty(f'Elevated self-referential pronoun density ({nlp.pronoun_density:.3f} > 0.08)', 0.05))
    if nlp.avg_sentence_complexity < 4.0 and nlp.word_count > 20:
        penalties.append(_Penalty('Fragmented / very short sentences detected', 0.05))
    return penalties

def _compute_nlp_score(nlp: NLPOutput) -> float:
    if nlp.error:
        logger.warning(f'[Fusion] NLP error reported — using fallback score: {nlp.error}')
        return 0.5
    anxiety_component = nlp.anxiety_score
    pronoun_component = min(nlp.pronoun_density / MAX_PRONOUN_DENSITY, 1.0)
    return anxiety_component * ANXIETY_COMPONENT_WEIGHT + pronoun_component * PRONOUN_COMPONENT_WEIGHT

def _compute_acoustic_score(speech: SpeechAnalysisResult) -> float:
    wpm = speech.speech_rate_wpm
    if wpm <= 0:
        return 0.0
    if ACOUSTIC_MID_LOW <= wpm <= ACOUSTIC_MID_HIGH:
        wpm_stress = 0.0
    elif wpm > ACOUSTIC_MID_HIGH:
        wpm_stress = min((wpm - ACOUSTIC_MID_HIGH) / 50.0, 1.0)
    else:
        wpm_stress = min((ACOUSTIC_MID_LOW - wpm) / 40.0, 1.0)
    pause_stress = min(speech.avg_pause_duration_sec / 4.0, 0.5)
    return 0.7 * wpm_stress + 0.3 * pause_stress

def _categorise_risk(composite: float, speech: SpeechAnalysisResult, nlp: NLPOutput) -> RiskLevel:
    if speech.speech_rate_wpm > WPM_HIGH and nlp.anxiety_score > NLP_HIGH_THRESHOLD:
        return RiskLevel.HIGH
    if composite >= COMPOSITE_HIGH_THRESHOLD:
        return RiskLevel.HIGH
    elif composite >= COMPOSITE_MODERATE_THRESHOLD:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW

def _build_reasoning(risk: RiskLevel, speech: SpeechAnalysisResult, nlp: NLPOutput, acoustic_score: float, nlp_score: float, composite: float, penalties: List[_Penalty], nlp_confidence: str) -> str:
    lines = [f'Risk Level : {risk.value}   Composite Score : {composite:.3f}', f'NLP Confidence : {nlp_confidence}', '', 'Acoustic Signals:', f'  Speech Rate     : {speech.speech_rate_wpm:.1f} WPM  (normal 100–150 WPM)', f'  Avg Pause       : {speech.avg_pause_duration_sec:.2f} s', f'  Acoustic Score  : {acoustic_score:.3f}  (weight {ACOUSTIC_WEIGHT})', '', 'Linguistic Signals  [NLP_Neurolytics / DistilRoBERTa]:', f'  Anxiety Score    : {nlp.anxiety_score:.3f}  = (fear×0.7) + (sadness×0.3)', f'  Fear             : {nlp.emotion_scores.fear:.3f}', f'  Sadness          : {nlp.emotion_scores.sadness:.3f}', f'  Dominant Emotion : {nlp.dominant_emotion}', f'  Pronoun Density  : {nlp.pronoun_density:.3f}  (threshold 0.08 / ceiling 0.15)', f'  Avg Sent. Length : {nlp.avg_sentence_complexity:.1f} words', f'  Word Count       : {nlp.word_count}', f'  NLP Sub-Score    : {nlp_score:.3f}  (weight {LINGUISTIC_WEIGHT})']
    if nlp.error:
        lines.append(f'  ⚠ NLP error — fallback score used: {nlp.error}')
    if penalties:
        lines += ['', 'Co-occurrence Penalties:']
        for p in penalties:
            lines.append(f'  ⚑ {p.description}  (+{p.amount:.2f})')
    lines += ['']
    if risk == RiskLevel.HIGH:
        lines.append('CLINICAL NOTE: Multiple high-confidence stress markers detected. Consider a direct check-in with the patient regarding emotional state.')
    elif risk == RiskLevel.MODERATE:
        lines.append('CLINICAL NOTE: Moderate stress signals present. Passive monitoring recommended; no immediate intervention required.')
    else:
        lines.append('CLINICAL NOTE: Stress markers within normal range. No significant anxiety signals detected in this consultation.')
    return '\n'.join(lines)

def fuse_signals(speech: SpeechAnalysisResult, nlp: NLPOutput) -> FusionResult:
    acoustic_score = _compute_acoustic_score(speech)
    nlp_score = _compute_nlp_score(nlp)
    base_composite = ACOUSTIC_WEIGHT * acoustic_score + LINGUISTIC_WEIGHT * nlp_score
    penalties = _evaluate_penalties(speech, nlp)
    penalty_sum = sum((p.amount for p in penalties))
    composite = min(base_composite + penalty_sum, 1.0)
    risk_level = _categorise_risk(composite, speech, nlp)
    nlp_confidence = 'low_data' if nlp.low_data_warning else 'full'
    reasoning = _build_reasoning(risk_level, speech, nlp, acoustic_score, nlp_score, composite, penalties, nlp_confidence)
    logger.info(f'[Fusion] acoustic={acoustic_score:.3f}  nlp_score={nlp_score:.3f}  composite={composite:.3f}  risk={risk_level}  nlp_conf={nlp_confidence}')
    return FusionResult(final_stress_risk=risk_level, composite_score=round(composite, 4), acoustic_score=round(acoustic_score, 4), nlp_score=round(nlp_score, 4), acoustic_weight=ACOUSTIC_WEIGHT, linguistic_weight=LINGUISTIC_WEIGHT, nlp_confidence=nlp_confidence, reasoning=reasoning)