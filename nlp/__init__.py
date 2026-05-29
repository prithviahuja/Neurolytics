# NLP module package
# Expose only the lightweight schema dataclasses at package import time.
# Heavy modules (nlp_module) are imported lazily to avoid pulling
# transformers/torch at import time which can fail if those deps
# are not installed or are incompatible with the runtime.
from .nlp_schemas import NLPOutput, EmotionScores

__all__ = ["NLPOutput", "EmotionScores"]
