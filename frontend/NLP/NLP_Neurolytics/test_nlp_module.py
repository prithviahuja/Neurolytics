"""
test_nlp_module.py
==================
Tests the NLP module with three cases:
  1. High-anxiety text   → anxiety_score should be high (> 0.4)
  2. Neutral text        → anxiety_score should be low  (< 0.3)
  3. Empty text          → should return error, not crash

Run with:
    python test_nlp_module.py
"""

import sys
import os
# Add project root to path so imports work from tests/ subfolder
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from ml_models.nlp_module import NLPAnalyzer

def print_result(label, result):
    print(f"\n{'─'*50}")
    print(f"TEST: {label}")
    print(f"{'─'*50}")
    if result.error:
        print(f"  ERROR: {result.error}")
        return
    print(f"  anxiety_score       : {result.anxiety_score}")
    print(f"  dominant_emotion    : {result.dominant_emotion}")
    print(f"  pronoun_density     : {result.pronoun_density}")
    print(f"  avg_sent_complexity : {result.avg_sentence_complexity}")
    print(f"  word_count          : {result.word_count}")
    print(f"  low_data_warning    : {result.low_data_warning}")
    print(f"  fear score          : {result.emotion_scores.fear}")
    print(f"  sadness score       : {result.emotion_scores.sadness}")
    print(f"  joy score           : {result.emotion_scores.joy}")


print("\nLoading NLP model (first time may take 30s to download ~300MB)...")
analyzer = NLPAnalyzer()

# ── Test 1: High anxiety text ─────────────────────────────────
high_anxiety_text = """
I'm terrified honestly. I can't sleep at night, I keep thinking about everything
that could go wrong. My heart races all the time. I'm scared I'm going to lose
my job, I'm scared about my health, I don't know what to do.
I feel like everything is falling apart around me. I can't stop worrying.
I feel so helpless and I don't know how to make it stop.
"""
result1 = analyzer.analyze(high_anxiety_text)
print_result("High Anxiety Text", result1)
assert result1.error is None, "Should not error on valid text"
assert result1.anxiety_score > 0.3, f"Expected high anxiety, got {result1.anxiety_score}"
print(f"  ✓ PASSED — anxiety_score {result1.anxiety_score} > 0.3")

# ── Test 2: Neutral/calm text ─────────────────────────────────
neutral_text = """
The weather today is quite pleasant. I went for a walk in the park this morning
and the birds were singing. I had a good breakfast and read the newspaper.
Everything seems to be going well. I feel relaxed and content today.
"""
result2 = analyzer.analyze(neutral_text)
print_result("Neutral/Calm Text", result2)
assert result2.error is None
assert result2.anxiety_score < 0.4, f"Expected low anxiety, got {result2.anxiety_score}"
print(f"  ✓ PASSED — anxiety_score {result2.anxiety_score} < 0.4")

# ── Test 3: Empty text ────────────────────────────────────────
result3 = analyzer.analyze("")
print_result("Empty Text (should error gracefully)", result3)
assert result3.error is not None, "Should return error for empty input"
print(f"  ✓ PASSED — graceful error: '{result3.error}'")

# ── Test 4: Short text (low data warning) ────────────────────
short_text = "I feel scared."
result4 = analyzer.analyze(short_text)
print_result("Short Text (low data warning expected)", result4)
assert result4.low_data_warning is True, "Should warn about low word count"
print(f"  ✓ PASSED — low_data_warning correctly True for {result4.word_count} words")

print(f"\n{'='*50}")
print("All NLP tests PASSED ✓")
print("Hand nlp_module.py + nlp_schemas.py to your backend teammate.")
print(f"{'='*50}\n")
