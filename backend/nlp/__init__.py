"""
NLP module package (within backend/)
====================================
Contains the NLP output dataclass contract (nlp_schemas) and
re-exports the NLPAnalyzer from services for backward compatibility.

Do NOT modify nlp_schemas.py — treat it as a sealed data contract.
"""
from nlp.nlp_schemas import NLPOutput, EmotionScores

__all__ = ["NLPOutput", "EmotionScores"]
