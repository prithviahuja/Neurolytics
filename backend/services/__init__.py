"""
services/__init__.py — Services Sub-Package
============================================
Exposes the two core service functions/classes used by main.py:
  • analyze_speech  — Speech & Diarization pipeline (WhisperX + Pyannote)
  • NLPAnalyzer     — NLP emotion/anxiety analysis (DistilRoBERTa)
"""

from services.speech_diarization import analyze_speech
from services.nlp_module import NLPAnalyzer

__all__ = ["analyze_speech", "NLPAnalyzer"]
