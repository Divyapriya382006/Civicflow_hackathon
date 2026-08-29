from __future__ import annotations

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

router = APIRouter()


class VoiceLogEntry(BaseModel):
    phase: str
    field: str
    text: str


class VoiceExtractRequest(BaseModel):
    transcript: str
    field_name: str
    field_type: str
    options: list[str] | None = None


@router.post('/voice/log')
async def log_voice_event(entry: VoiceLogEntry) -> dict[str, bool]:
    print(f"[VOICE-LOG] phase={entry.phase} field={entry.field} text={entry.text}", flush=True)
    return {'ok': True}


@router.post('/voice/transcribe')
async def transcribe_voice(audio: UploadFile = File(...)) -> dict[str, str]:
    content = await audio.read()
    if not content:
        return {'transcript': ''}

    # Placeholder implementation; replace with real Whisper call in production.
    return {'transcript': 'Voice transcription placeholder. Replace with Whisper call.'}


@router.post('/voice/extract')
async def extract_voice_value(payload: VoiceExtractRequest) -> dict[str, str]:
    transcript = (payload.transcript or '').strip()
    field_type = (payload.field_type or '').strip()
    options = payload.options or []

    if not transcript:
        return {'extracted_value': 'NO_MATCH'}

    if options:
        lowered = transcript.lower()
        for option in options:
            if option.lower() == lowered or lowered in option.lower():
                return {'extracted_value': option}
        if not any(option.lower() in lowered for option in options):
            return {'extracted_value': 'NO_MATCH'}

    if field_type in {'date', 'number', 'phone', 'address', 'name', 'free_text'}:
        cleaned = transcript
        if field_type == 'name':
            cleaned = transcript.replace('my name is', '').strip()
        elif field_type == 'date':
            cleaned = transcript.replace('date', '').strip()
        elif field_type == 'number':
            cleaned = ''.join(ch for ch in transcript if ch.isdigit() or ch in {'-', ' '})
        return {'extracted_value': cleaned or transcript}

    return {'extracted_value': transcript}
