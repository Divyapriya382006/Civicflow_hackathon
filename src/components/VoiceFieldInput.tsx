import React, { useMemo, useRef, useState } from 'react';
import { Mic, RotateCcw, Check, Keyboard, Loader2, AlertCircle } from 'lucide-react';
import { ServiceFieldDefinition } from '../types';

interface VoiceFieldInputProps {
  field: ServiceFieldDefinition;
  value: string;
  onChange: (fieldId: string, value: string) => void;
  hideVoiceControls?: boolean;
}

// Minimal browser speech recognition shim for Chrome/Edge.
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const isSelectField = (field: ServiceFieldDefinition) => field.type === 'select' && Boolean(field.options?.length);

export const VoiceFieldInput: React.FC<VoiceFieldInputProps> = ({ field, value, onChange, hideVoiceControls = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [confirmedTranscript, setConfirmedTranscript] = useState(value || '');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any | null>(null);

  const voiceHint = useMemo(() => {
    if (field.voiceHint) return field.voiceHint;
    if (field.type === 'date') return 'date';
    if (field.type === 'tel' || field.id.toLowerCase().includes('phone')) return 'phone';
    if (field.id.toLowerCase().includes('address') || field.label.toLowerCase().includes('address')) return 'address';
    if (field.type === 'select') return 'free_text';
    if (field.id.toLowerCase().includes('dob') || field.id.toLowerCase().includes('date')) return 'date';
    if (field.id.toLowerCase().includes('name') || field.label.toLowerCase().includes('name')) return 'name';
    if (field.id.toLowerCase().includes('mobile') || field.id.toLowerCase().includes('phone')) return 'phone';
    if (field.id.toLowerCase().includes('number') || field.id.toLowerCase().includes('id')) return 'number';
    return 'free_text';
  }, [field]);

  const stopRecognition = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setError('Speech recognition is not available in this browser. Use Type instead.');
      return;
    }

    setError('');
    setLiveTranscript('');
    setIsListening(true);
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setLiveTranscript(transcript.trim());
    };

    recognition.onerror = (event: any) => {
      setError(event?.error ? `Speech error: ${event.error}` : 'Speech recognition failed.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (liveTranscript.trim()) {
        setConfirmedTranscript(liveTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleConfirm = () => {
    const finalValue = confirmedTranscript.trim();
    if (!finalValue) {
      setError('Please capture or type a value before confirming.');
      return;
    }
    onChange(field.id, finalValue);
    setError('');
  };

  const handleUseTypedInput = () => {
    if (hideVoiceControls) return;
    setShowManualInput((prev) => !prev);
    setError('');
  };

  const handleFallbackToWhisper = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, `${field.id}.webm`);

        const response = await fetch('/voice/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Whisper transcription failed');
        }

        const data = await response.json();
        setConfirmedTranscript(data.transcript || '');
        setLiveTranscript(data.transcript || '');
        stream.getTracks().forEach((track) => track.stop());
        setIsProcessing(false);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'High-accuracy fallback failed.');
      setIsProcessing(false);
    }
  };

  const label = `${field.label}${field.required ? ' *' : ''}`;

  const showVisibleInput = hideVoiceControls || showManualInput;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-300 mb-0.5">
          {label}
        </label>
        {!hideVoiceControls && (
          <button
            type="button"
            onClick={handleUseTypedInput}
            className="text-[10px] font-medium text-slate-300 hover:text-white underline underline-offset-2"
          >
            Type instead
          </button>
        )}
      </div>

      {isSelectField(field) ? (
        <div className="space-y-2">
          <select
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="">Select an option</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900">
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : showVisibleInput ? (
        <input
          type={field.type === 'date' ? 'date' : field.type}
          value={value || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
        />
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startListening}
              disabled={isListening || isProcessing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold disabled:opacity-60"
            >
              {isListening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
              {isListening ? 'Listening...' : `🎤 Speak ${field.label}`}
            </button>

            <button
              type="button"
              onClick={stopRecognition}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold hover:bg-slate-700"
            >
              Stop
            </button>
          </div>

          {(liveTranscript || confirmedTranscript) && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Detected value</div>
              <input
                value={confirmedTranscript}
                onChange={(e) => setConfirmedTranscript(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-200"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>

            <button
              type="button"
              onClick={() => { setConfirmedTranscript(''); setLiveTranscript(''); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-record
            </button>

            <button
              type="button"
              onClick={handleFallbackToWhisper}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/60 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-semibold"
            >
              <Mic className="w-3.5 h-3.5" /> High accuracy
            </button>
          </div>

          {liveTranscript && !confirmedTranscript && (
            <div className="text-[10px] text-slate-400">Live transcript: {liveTranscript}</div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-200">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {field.helperText && (
        <p className="text-[11px] text-slate-500 mt-1">{field.helperText}</p>
      )}

      {field.isSensitivePII && (
        <div className="text-[10px] text-blue-400 italic">Protected PII field</div>
      )}
    </div>
  );
};
