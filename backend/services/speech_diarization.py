from __future__ import annotations
import logging
import os
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv
load_dotenv()
from schemas import SpeechAnalysisResult
logger = logging.getLogger(__name__)
try:
    import whisperx
    import torch
    from whisperx.diarize import DiarizationPipeline
    WHISPERX_AVAILABLE = True
except Exception as exc:
    whisperx = None
    torch = None
    DiarizationPipeline = None
    WHISPERX_AVAILABLE = False
    logger.warning(f'whisperx or torch failed to import. Speech analysis is disabled until dependencies are fixed. Error: {exc}')
WHISPER_MODEL_SIZE = 'base'
BATCH_SIZE = 16
MIN_SPEAKERS = 2
MAX_SPEAKERS = 2
SUPPORTED_FORMATS = {'.wav', '.mp3', '.mp4', '.m4a', '.flac'}
_asr_model = None
_diarize_model = None
_device = None
_compute_type = None

@dataclass
class WordSegment:
    word: str
    start: float
    end: float
    speaker: str
    score: Optional[float] = None

@dataclass
class SpeakerSegment:
    speaker: str
    start: float
    end: float
    text: str

def _get_device() -> Tuple[str, str]:
    if WHISPERX_AVAILABLE and torch is not None and torch.cuda.is_available():
        return ('cuda', 'float16')
    return ('cpu', 'int8')

def _load_asr_model(model_size: str, device: str, compute_type: str):
    global _asr_model
    if _asr_model is None:
        logger.info(f"[Speech] Loading WhisperX ASR model '{model_size}' on {device}")
        _asr_model = whisperx.load_model(model_size, device=device, compute_type=compute_type)
    return _asr_model

def _load_diarize_model(device: str):
    global _diarize_model
    if _diarize_model is None:
        hf_token = os.getenv('HF_TOKEN')
        if not hf_token:
            raise ValueError('HuggingFace token required for speaker diarization. Set HF_TOKEN in backend/.env  (copy backend/.env.example → backend/.env).')
        logger.info('[Speech] Loading pyannote diarization model (v3.1)')
        _diarize_model = DiarizationPipeline(model_name='pyannote/speaker-diarization-3.1', token=hf_token, device=device)
    return _diarize_model

def _load_audio(audio_path: str):
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f'Audio file not found: {audio_path}')
    if path.suffix.lower() not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported format '{path.suffix}'. Supported: {sorted(SUPPORTED_FORMATS)}")
    file_size = path.stat().st_size
    audio = whisperx.load_audio(str(path))
    duration = len(audio) / 16000
    import numpy as np
    fingerprint = float(np.mean(np.abs(audio[:1600]))) if len(audio) >= 1600 else 0.0
    logger.info(f'[Speech] Audio loaded: {path.name} | file={file_size:,}B | duration={duration:.1f}s | fingerprint(mean_abs_first_0.1s)={fingerprint:.6f}')
    if duration < 1.0:
        raise ValueError('Audio too short (< 1 second).')
    return audio

def _transcribe(audio: Any, asr_model: Any, batch_size: int):
    logger.info('[Speech] Transcribing audio')
    result = asr_model.transcribe(audio, batch_size=batch_size, language='en')
    if not result.get('segments'):
        raise ValueError('No speech detected in the audio file.')
    logger.info(f'[Speech] Transcription complete. Language={result.get("language")} Segments={len(result["segments"])}')
    return result

def _align(audio: Any, result: Dict[str, Any], device: str):
    logger.info('[Speech] Aligning word-level timestamps')
    alignment_model, metadata = whisperx.load_align_model(language_code=result.get('language', 'en'), device=device)
    aligned = whisperx.align(result['segments'], alignment_model, metadata, audio, device, return_char_alignments=False)
    del alignment_model
    if device == 'cuda' and torch is not None:
        torch.cuda.empty_cache()
    logger.info('[Speech] Alignment complete')
    return aligned

def _diarize(audio_path: str, diarize_model: Any, num_speakers: int):
    logger.info(f'[Speech] Diarizing audio for {num_speakers} speakers')
    diarize_df = diarize_model(audio_path, num_speakers=num_speakers)
    logger.info('[Speech] Diarization complete')
    return diarize_df

def _assign_speakers(aligned: Dict[str, Any], diarize_df: Any) -> Dict[str, Any]:
    logger.info('[Speech] Assigning speaker labels to words')
    return whisperx.assign_word_speakers(diarize_df, aligned)

def _extract_speaker_segments(final_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    for seg in final_result.get('segments', []):
        text = seg.get('text', '').strip()
        if not text:
            continue
        segments.append({'speaker': seg.get('speaker', 'UNKNOWN'), 'text': text, 'start': round(seg.get('start', 0.0), 3), 'end': round(seg.get('end', 0.0), 3)})
    return segments

def _identify_patient_speaker(segments: List[Dict[str, Any]]) -> str:
    from collections import Counter
    word_counts = Counter()
    for seg in segments:
        word_counts[seg['speaker']] += len(seg['text'].split())
    known = [speaker for speaker in word_counts if speaker != 'UNKNOWN']
    if not known:
        raise ValueError('No speakers labelled after diarization. Verify your HF_TOKEN and accept the pyannote license at https://hf.co/pyannote/speaker-diarization-3.1')
    if len(known) == 1:
        logger.warning(f'[Speech] Only one speaker detected ({known[0]}). Treating as patient.')
        return known[0]
    patient_id = max(known, key=lambda speaker: word_counts[speaker])
    logger.info(f'[Speech] Speaker word counts: {dict(word_counts)}')
    logger.info(f'[Speech] Identified patient speaker as: {patient_id}')
    return patient_id

def _get_other_speaker(word_segments: List[WordSegment], patient_id: str) -> str:
    for w in word_segments:
        if w.speaker != patient_id:
            return w.speaker
    return 'SPEAKER_00'

def _extract_word_segments(segments: List[Dict[str, Any]]) -> List[WordSegment]:
    words: List[WordSegment] = []
    for seg in segments:
        for w in seg.get('words', []):
            speaker = w.get('speaker') or seg.get('speaker') or 'UNKNOWN'
            if 'start' not in w or 'end' not in w:
                continue
            words.append(WordSegment(word=w.get('word', '').strip(), start=w['start'], end=w['end'], speaker=speaker, score=w.get('score')))
    words.sort(key=lambda item: item.start)
    return words

def _calculate_acoustic_features(patient_words: List[WordSegment]) -> Tuple[float, float, float]:
    if not patient_words:
        return (0.0, 0.0, 0.0)
    total_speaking_time = patient_words[-1].end - patient_words[0].start
    if total_speaking_time <= 0:
        return (0.0, 0.0, 0.0)
    total_words = len(patient_words)
    speaking_time_minutes = total_speaking_time / 60.0
    wpm = total_words / speaking_time_minutes if speaking_time_minutes > 0 else 0.0
    pauses: List[float] = []
    for i in range(1, len(patient_words)):
        gap = patient_words[i].start - patient_words[i - 1].end
        if gap > 0.1:
            pauses.append(gap)
    avg_pause = statistics.mean(pauses) if pauses else 0.0
    return (wpm, total_speaking_time, avg_pause)

def analyze_speech(audio_path: str, num_speakers: int=2, patient_speaker_id: Optional[str]=None) -> SpeechAnalysisResult:
    if not WHISPERX_AVAILABLE:
        raise RuntimeError('WhisperX is not installed. Install it via: pip install git+https://github.com/m-bain/whisperx.git')
    global _device, _compute_type
    _device, _compute_type = _get_device()
    logger.info(f'[Speech] Device={_device}  compute={_compute_type}')
    asr_model = _load_asr_model(WHISPER_MODEL_SIZE, _device, _compute_type)
    diarize_model = _load_diarize_model(_device)
    audio = _load_audio(audio_path)
    transcription = _transcribe(audio, asr_model, BATCH_SIZE)
    aligned = _align(audio, transcription, _device)
    diarize_df = _diarize(audio_path, diarize_model, num_speakers)
    final = _assign_speakers(aligned, diarize_df)
    speaker_segments = _extract_speaker_segments(final)
    if patient_speaker_id is None:
        patient_speaker_id = _identify_patient_speaker(speaker_segments)
    else:
        logger.info(f'[Speech] Patient speaker overridden to: {patient_speaker_id}')
    word_segments = _extract_word_segments(final.get('segments', []))
    patient_words = [w for w in word_segments if w.speaker == patient_speaker_id]
    doctor_id = _get_other_speaker(word_segments, patient_speaker_id)
    doctor_words = [w for w in word_segments if w.speaker == doctor_id]
    patient_transcript = ' '.join((w.word for w in patient_words))
    doctor_transcript = ' '.join((w.word for w in doctor_words))
    wpm, speaking_time, avg_pause = _calculate_acoustic_features(patient_words)
    logger.info(f'[Speech] Patient WPM={wpm:.1f}  speaking_time={speaking_time:.1f}s  avg_pause={avg_pause:.2f}s')
    return SpeechAnalysisResult(patient_transcript=patient_transcript, doctor_transcript=doctor_transcript, speech_rate_wpm=round(wpm, 2), total_patient_words=len(patient_words), patient_speaking_time=round(speaking_time, 3), avg_pause_duration_sec=round(avg_pause, 3), patient_speaker_id=patient_speaker_id)