"""
INTEGRATION_GUIDE.md
====================
Hey backend teammate — this is everything you need to plug in
the NLP module. You don't need to read nlp_module.py at all.

FILES YOU NEED
──────────────
  ml_models/nlp_module.py       ← the model (don't touch)
  ml_models/nlp_schemas.py      ← the output types (read this)

TWO-STEP INTEGRATION
────────────────────

STEP 1 — Initialize ONCE at server startup (top of main.py):

    from ml_models.nlp_module import NLPAnalyzer

    # This loads the 500MB model into RAM.
    # Do this at module level, NOT inside the endpoint function.
    nlp_analyzer = NLPAnalyzer()

STEP 2 — Call inside your /analyze endpoint:

    # patient_transcript comes from the speech module
    nlp_result = nlp_analyzer.analyze(patient_transcript)

    # ALWAYS check for errors first
    if nlp_result.error:
        # NLP failed — you can still return acoustic data
        # but flag reduced confidence in your response
        nlp_failed = True

    # Use these fields in your fusion algorithm:
    nlp_result.anxiety_score          # float 0.0–1.0  ← PRIMARY signal
    nlp_result.pronoun_density        # float 0.0–1.0
    nlp_result.emotion_scores.fear    # float 0.0–1.0
    nlp_result.emotion_scores.sadness # float 0.0–1.0
    nlp_result.word_count             # int
    nlp_result.low_data_warning       # bool ← lower confidence if True
    nlp_result.dominant_emotion       # str e.g. "fear", "neutral"

FUSION ALGORITHM (copy this into your fusion.py):

    def compute_nlp_score(nlp_result) -> float:
        if nlp_result.error:
            return 0.5  # fallback neutral score
        
        MAX_PRONOUN_DENSITY = 0.15
        
        anxiety_component  = nlp_result.anxiety_score
        pronoun_component  = min(nlp_result.pronoun_density / MAX_PRONOUN_DENSITY, 1.0)
        
        return (anxiety_component * 0.8) + (pronoun_component * 0.2)

REQUIREMENTS TO ADD TO requirements.txt:

    transformers==4.40.2
    torch==2.2.2
    scipy==1.13.0

THAT'S IT. One import, one init, one function call.
"""
