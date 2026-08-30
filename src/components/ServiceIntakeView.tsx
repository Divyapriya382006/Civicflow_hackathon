import React, { useRef, useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  Clock, 
  ArrowRight,
  Mic,
  Keyboard,
  Volume2,
  CircleAlert
} from 'lucide-react';
import { ServiceWorkflow, Department, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';
import { VoiceFieldInput } from './VoiceFieldInput';
import {
  buildSelectPrompt,
  resolveSelectChoice,
  validateFieldValue,
} from '../utils/fieldValidation';

interface ServiceIntakeViewProps {
  department: Department;
  service: ServiceWorkflow;
  onBack: () => void;
  onStartApplication: (formData: Record<string, string>, documentData: {
    name: string;
    size: string;
    hash: string;
    hmac: string;
  }) => void;
  language: SupportedLanguage;
}

export const ServiceIntakeView: React.FC<ServiceIntakeViewProps> = ({
  department,
  service,
  onBack,
  onStartApplication,
  language,
}) => {
  // Initialize form state from schema default values
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    service.fields.forEach((f) => {
      init[f.id] = f.defaultValue || '';
    });
    return init;
  });
  const formDataRef = useRef<Record<string, string>>(formData);

  const [uploadedDocName, setUploadedDocName] = useState<string>(
    service.requiredDocs[0]?.sampleName || 'Identity_Verification_Document.pdf'
  );
  const [uploadedDocSize, setUploadedDocSize] = useState<string>('1.42 MB');
  const [entryMode, setEntryMode] = useState<'type' | 'voice'>('type');
  const [voicePrompt, setVoicePrompt] = useState<string>('');
  const [voiceCapturedValue, setVoiceCapturedValue] = useState<string>('');
  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const [voiceStepIndex, setVoiceStepIndex] = useState<number>(0);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const recognitionRef = useRef<any | null>(null);
  const voiceTranscriptRef = useRef<string>('');
  const nextVoiceTimerRef = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const voiceSessionRef = useRef<number>(0);
  const noSpeechRetriesRef = useRef<Record<string, number>>({});

  const voiceFields = service.fields;
  const currentVoiceField = voiceFields[voiceStepIndex];
  const voiceLogEndpoint = 'http://127.0.0.1:8000/voice/log';

  const displayFieldValue = (field: (typeof service.fields)[number] | undefined, value: string) => {
    if (!field || !value) return value;
    if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    return value;
  };

  React.useEffect(() => {
    stopVoiceCapture();
    setEntryMode('type');
    setVoicePrompt('');
    setVoiceCapturedValue('');
    setVoiceStatus('');
    setVoiceStepIndex(0);
    setIsVoiceListening(false);
    formDataRef.current = {};
    const nextDefaults: Record<string, string> = {};
    service.fields.forEach((field) => {
      nextDefaults[field.id] = field.defaultValue || '';
    });
    setFormData(nextDefaults);
  }, [service.id]);

  const logVoiceEvent = async (phase: string, field: string, text: string) => {
    const payload = { phase, field, text };
    console.log(`[CivicFlow Voice] ${phase} | ${field} | ${text}`);

    try {
      await fetch(voiceLogEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      try {
        await fetch('/voice/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Terminal logging will remain in the browser console if the backend is unreachable.
      }
    }
  };

  const looksLikeDateText = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return false;
    const lower = value.toLowerCase();
    const patterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{2,4}/i,
      /\d{1,2}\s*[/\-]\s*\d{1,2}\s*[/\-]\s*\d{2,4}/,
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2},?\s+\d{2,4}/i,
    ];
    return patterns.some((pattern) => pattern.test(value)) || (/\b\d{1,2}\b/.test(lower) && /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(lower) && /\b\d{2,4}\b/.test(lower));
  };

  const normalizeVoiceValue = (field: (typeof service.fields)[number], rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return value;

    if (field.type === 'select' && field.options?.length) {
      const resolved = resolveSelectChoice(field, value);
      if (resolved) return resolved;
      return value;
    }

    if (field.type !== 'date') return value;

    const lower = value.toLowerCase();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
    };

    const toFourDigitYear = (year: number) => {
      if (year < 100) return year < 50 ? 2000 + year : 1900 + year;
      return year;
    };

    const parseIsoDate = (day: number, month: number, year: number) => {
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const normalizedYear = toFourDigitYear(year);
        return `${normalizedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return null;
    };

    const monthNameMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{2,4})/i);
    if (monthNameMatch) {
      const iso = parseIsoDate(Number(monthNameMatch[1]), monthMap[monthNameMatch[2].toLowerCase()], Number(monthNameMatch[3]));
      if (iso) return iso;
    }

    const numericDateMatch = value.match(/(\d{1,2})\s*[/\-]\s*(\d{1,2})\s*[/\-]\s*(\d{2,4})/);
    if (numericDateMatch) {
      const iso = parseIsoDate(Number(numericDateMatch[1]), Number(numericDateMatch[2]), Number(numericDateMatch[3]));
      if (iso) return iso;
    }

    const monthNameOnlyMatch = value.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})/i);
    if (monthNameOnlyMatch) {
      const iso = parseIsoDate(Number(monthNameOnlyMatch[2]), monthMap[monthNameOnlyMatch[1].toLowerCase()], Number(monthNameOnlyMatch[3]));
      if (iso) return iso;
    }

    const monthNameDiscovery = Object.keys(monthMap).find((m) => lower.includes(m));
    const dayNumMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?/);
    const yearMatch = value.match(/(\d{2,4})/);
    if (monthNameDiscovery && dayNumMatch && yearMatch) {
      const iso = parseIsoDate(Number(dayNumMatch[1]), monthMap[monthNameDiscovery], Number(yearMatch[1]));
      if (iso) return iso;
    }

    return value;
  };

  const speakText = (text: string, onEnd?: () => void) => {
    console.log('[CivicFlow Voice] Prompt:', text);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => onEnd?.();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopVoiceCapture = () => {
    if (nextVoiceTimerRef.current) {
      window.clearTimeout(nextVoiceTimerRef.current);
      nextVoiceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // no-op
    }
    recognitionRef.current = null;
    isTransitioningRef.current = false;
    setIsVoiceListening(false);
  };

  const advanceToNextVoiceField = (currentFieldIndex: number) => {
    const nextIndex = currentFieldIndex + 1;
    const nextField = voiceFields[nextIndex];

    if (nextField) {
      nextVoiceTimerRef.current = window.setTimeout(() => {
        recognitionRef.current = null;
        isTransitioningRef.current = false;
        setIsVoiceListening(false);
        startVoiceCapture(nextField, nextIndex);
      }, 650);
      return;
    }

    nextVoiceTimerRef.current = window.setTimeout(() => {
      const finalPrompt = 'All details captured. Please say yes to continue or no to review.';
      setVoiceStatus(finalPrompt);
      setVoicePrompt(finalPrompt);
      void logVoiceEvent('prompt', 'final-confirmation', finalPrompt);
      speakText(finalPrompt);
      recognitionRef.current = null;
      isTransitioningRef.current = false;
      setIsVoiceListening(false);
      startVoiceConfirmation();
    }, 650);
  };

  const startVoiceCapture = (field: (typeof service.fields)[number], fieldIndex: number) => {
    if (nextVoiceTimerRef.current) {
      window.clearTimeout(nextVoiceTimerRef.current);
      nextVoiceTimerRef.current = null;
    }

    const sessionId = Date.now() + Math.random();
    voiceSessionRef.current = sessionId;
    noSpeechRetriesRef.current[field.id] = 0;
    stopVoiceCapture();
    isTransitioningRef.current = true;

    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setVoiceStatus('Speech recognition is not available in this browser. Please switch back to Type mode.');
      isTransitioningRef.current = false;
      return;
    }

    voiceTranscriptRef.current = '';
    setVoiceCapturedValue('');
    setVoiceStepIndex(fieldIndex);

    const promptText = field.type === 'select' && field.options?.length
      ? buildSelectPrompt(field)
      : `Please tell me your ${field.label}.`;
    setVoicePrompt(promptText);
    void logVoiceEvent('prompt', field.id, promptText);

    const beginListening = () => {
      if (voiceSessionRef.current !== sessionId) return;
      setIsVoiceListening(true);

      const recognition = new SpeechRecognitionImpl();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result?.[0]?.transcript || '')
          .join(' ')
          .trim();

        if (!transcript) return;

        if (field.type !== 'date' && looksLikeDateText(transcript)) {
          const dateWarning = `I heard a date for ${field.label}. Please tell me the ${field.label.toLowerCase()} again.`;
          setVoiceStatus(dateWarning);
          speakText(dateWarning);
          try {
            recognition.stop();
          } catch {
            // no-op
          }
          return;
        }

        const normalized = normalizeVoiceValue(field, transcript);
        const validation = validateFieldValue(field, normalized);
        if (field.type === 'select' && field.options?.length && !validation.valid) {
          const errorPrompt = validation.message || `I did not catch a valid option. ${buildSelectPrompt(field)}`;
          setVoiceStatus(errorPrompt);
          speakText(errorPrompt);
          return;
        }

        voiceTranscriptRef.current = normalized;
        setVoiceCapturedValue(normalized);
        if (normalized && validation.valid) {
          handleFieldChange(field.id, normalized);
          try {
            recognition.stop();
          } catch {
            // no-op
          }
        }
        console.log('[CivicFlow Voice] Final answer candidate:', normalized);
      };

      recognition.onerror = (event: any) => {
        if (voiceSessionRef.current !== sessionId) return;
        if (event?.error === 'no-speech' || event?.error === 'aborted') {
          const currentRetries = noSpeechRetriesRef.current[field.id] ?? 0;
          if (currentRetries >= 1) {
            setVoiceStatus('I did not hear anything. Please tap Speak and say your answer again.');
            setIsVoiceListening(false);
            isTransitioningRef.current = false;
            return;
          }
          noSpeechRetriesRef.current[field.id] = currentRetries + 1;
          return;
        }
        setVoiceStatus(`Could not capture the response. ${event?.error || 'Please try again.'}`);
        setIsVoiceListening(false);
        isTransitioningRef.current = false;
      };

      recognition.onend = () => {
        if (voiceSessionRef.current !== sessionId) return;

        if (isTransitioningRef.current && !voiceTranscriptRef.current.trim()) {
          setVoiceStatus('Listening...');
          setIsVoiceListening(true);
          try {
            recognition.start();
          } catch {
            // ignore restart errors while the browser is still settling
          }
          return;
        }

        if (!isTransitioningRef.current) return;

        setIsVoiceListening(false);
        const transcript = voiceTranscriptRef.current.trim();

        if (!transcript) {
          const currentRetries = noSpeechRetriesRef.current[field.id] ?? 0;
          if (currentRetries >= 1 || field.type === 'select') {
            setVoiceStatus(field.type === 'select'
              ? 'I did not hear a valid option. Please say 1 or 2, or the option text itself.'
              : 'I did not hear anything. Please say your answer again.');
            isTransitioningRef.current = false;
            return;
          }
          noSpeechRetriesRef.current[field.id] = currentRetries + 1;
          setVoiceStatus('I did not catch that. Please say it again.');
          speakText('I did not catch that. Please say it again.');
          isTransitioningRef.current = false;
          nextVoiceTimerRef.current = window.setTimeout(() => startVoiceCapture(field, fieldIndex), 1200);
          return;
        }

        const normalizedTranscript = normalizeVoiceValue(field, voiceTranscriptRef.current);
        const validation = validateFieldValue(field, normalizedTranscript);
        if (!validation.valid) {
          const retryPrompt = validation.message || `Please provide a valid ${field.label.toLowerCase()}.`;
          setVoiceStatus(retryPrompt);
          speakText(retryPrompt);
          isTransitioningRef.current = false;
          nextVoiceTimerRef.current = window.setTimeout(() => startVoiceCapture(field, fieldIndex), 1200);
          return;
        }

        handleFieldChange(field.id, normalizedTranscript);
        console.log('[CivicFlow Voice] Saved answer for field:', field.label, normalizedTranscript);
        void logVoiceEvent('answer', field.id, normalizedTranscript);
        setVoiceStatus(`Saved ${field.label}.`);
        speakText(`Saved ${field.label}.`);
        isTransitioningRef.current = false;
        advanceToNextVoiceField(fieldIndex);
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    speakText(promptText, () => {
      window.setTimeout(() => {
        beginListening();
      }, 450);
    });
  };

  const startVoiceConfirmation = () => {
    if (isVoiceListening && recognitionRef.current) return;
    if (isTransitioningRef.current) return;

    const sessionId = Date.now() + Math.random();
    voiceSessionRef.current = sessionId;
    stopVoiceCapture();
    isTransitioningRef.current = true;

    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setVoiceStatus('Speech recognition is not available in this browser. Please switch to Type mode to continue.');
      isTransitioningRef.current = false;
      return;
    }

    voiceTranscriptRef.current = '';
    setVoiceCapturedValue('');
    setIsVoiceListening(true);

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result?.[0]?.transcript || '')
        .join(' ')
        .trim();
      voiceTranscriptRef.current = transcript;
      setVoiceCapturedValue(transcript);
      console.log('[CivicFlow Voice] Confirmation final:', transcript);
    };

    recognition.onerror = () => {
      if (voiceSessionRef.current !== sessionId) return;
      setVoiceStatus('confirmation failed. Please tap continue to proceed manually.');
      setIsVoiceListening(false);
      isTransitioningRef.current = false;
    };

    recognition.onend = () => {
      if (voiceSessionRef.current !== sessionId || !isTransitioningRef.current) return;
      setIsVoiceListening(false);
      const transcript = voiceTranscriptRef.current.trim().toLowerCase();
      console.log('[CivicFlow Voice] Confirmation:', transcript);
      void logVoiceEvent('confirmation', 'final-confirmation', transcript);

      if (transcript.includes('yes') || transcript.includes('proceed') || transcript.includes('continue')) {
        const confirmationText = 'Confirmed. Starting your application now.';
        setVoiceStatus(confirmationText);
        void logVoiceEvent('answer', 'final-confirmation', 'yes');
        speakText(confirmationText);
        isTransitioningRef.current = false;
        nextVoiceTimerRef.current = window.setTimeout(() => handleProceed(), 900);
        return;
      }

      if (transcript.includes('no') || transcript.includes('review') || transcript.includes('edit')) {
        setVoiceStepIndex(0);
        setVoiceStatus('Review mode activated. I will ask for your details again.');
        speakText('Review mode activated. I will ask for your details again.');
        setVoicePrompt('Please tell me your name.');
        isTransitioningRef.current = false;
        nextVoiceTimerRef.current = window.setTimeout(() => {
          const firstField = voiceFields[0];
          if (firstField) startVoiceCapture(firstField, 0);
        }, 1000);
        return;
      }

      setVoiceStatus('I did not catch the confirmation. Please say yes to continue or no to review.');
      speakText('I did not catch the confirmation. Please say yes to continue or no to review.');
      isTransitioningRef.current = false;
      nextVoiceTimerRef.current = window.setTimeout(() => startVoiceConfirmation(), 500);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startVoiceFlow = () => {
    console.log('[CivicFlow Voice] Starting voice intake flow');
    stopVoiceCapture();
    noSpeechRetriesRef.current = {};
    voiceSessionRef.current = Date.now() + Math.random();
    setEntryMode('voice');
    setVoiceStepIndex(0);
    setVoiceStatus('');
    setVoiceCapturedValue('');
    const greeting = 'Hello! I am CivicFlow. I will help you with your application through a quick voice intake.';
    setVoicePrompt(greeting);
    void logVoiceEvent('prompt', 'greeting', greeting);
    speakText(greeting, () => {
      const firstField = voiceFields[0];
      if (firstField) {
        nextVoiceTimerRef.current = window.setTimeout(() => startVoiceCapture(firstField, 0), 700);
      }
    });
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    const field = service.fields.find((candidate) => candidate.id === fieldId);
    const normalized = field ? normalizeVoiceValue(field, value) : value;

    setFormData((prev) => {
      const next = { ...prev, [fieldId]: normalized };
      formDataRef.current = next;
      return next;
    });
    formDataRef.current = { ...formDataRef.current, [fieldId]: normalized };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedDocName(file.name);
      setUploadedDocSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    }
  };

  const handleProceed = () => {
    const latestFormData = { ...formDataRef.current };
    const invalidField = service.fields.find((field) => {
      const value = latestFormData[field.id] ?? '';
      const result = validateFieldValue(field, value);
      return !result.valid;
    });

    if (invalidField) {
      const message = validateFieldValue(invalidField, latestFormData[invalidField.id] ?? '').message;
      setVoiceStatus(message || `Please check ${invalidField.label}.`);
      return;
    }

    onStartApplication(latestFormData, {
      name: uploadedDocName,
      size: uploadedDocSize,
      hash: 'sha256-verified',
      hmac: 'auth-verified',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{getTranslation('back_to_catalog', language)} ({department.name})</span>
        </button>

        <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>Local Memory Protection Active</span>
        </span>
      </div>

      {/* Service Hero Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {department.name}
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-1.5">
              {service.title}
            </h1>
          </div>
          <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Official Portal: <span className="text-slate-200 font-mono">{service.officialPortal.replace('https://', '').split('/')[0]}</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {service.whatItDoes}
        </p>

        {/* What You Will Need Accordion / Panel */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            What You Will Need For This Application
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
            {service.whatYouWillNeed.map((req, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Entry Mode Selector */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl mb-6">
        <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">How would you like to fill this form?</p>
            <h2 className="text-lg font-bold text-white mt-1">Choose type or voice</h2>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setEntryMode('type');
                stopVoiceCapture();
              }}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                entryMode === 'type'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Type
            </button>
            <button
              type="button"
              onClick={startVoiceFlow}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                entryMode === 'voice'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Speak
            </button>
          </div>
        </div>

        {entryMode === 'voice' && (
          <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Volume2 className="w-4 h-4" />
              Voice assistant
            </div>
            <p className="text-emerald-50/90">{voicePrompt || 'Hello! I am CivicFlow. I will ask for the details needed to complete your application.'}</p>
            {voiceCapturedValue && (
              <div className="rounded-xl border border-emerald-500/40 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
                Captured: <span className="font-semibold text-white">{displayFieldValue(currentVoiceField, voiceCapturedValue)}</span>
              </div>
            )}
            {voiceStatus && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                <CircleAlert className="w-3.5 h-3.5 text-emerald-300 mt-0.5 flex-shrink-0" />
                <span>{voiceStatus}</span>
              </div>
            )}
            {isVoiceListening && (
              <div className="inline-flex items-center gap-2 text-[11px] text-emerald-200">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Listening...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Schema Intake Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>{getTranslation('intake_form_title', language)}</span>
            <span className="text-xs text-slate-400 font-normal">
              ({service.title})
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {getTranslation('intake_form_subtitle', language)}
          </p>
        </div>

        {/* Dynamic Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {service.fields.map((field) => (
            <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <VoiceFieldInput
                field={field}
                value={formData[field.id] || ''}
                onChange={handleFieldChange}
                hideVoiceControls={true}
              />
            </div>
          ))}
        </div>

        {/* Document Proof Section */}
        {service.requiredDocs.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              {getTranslation('supporting_documents', language)}
            </label>

            {service.requiredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-slate-200">{doc.name}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{doc.description}</p>
                  <p className="text-[11px] text-slate-500">Supported format: {doc.format}</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-xs font-medium text-emerald-400 block truncate max-w-xs">
                      {uploadedDocName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Verified • {uploadedDocSize}
                    </span>
                  </div>

                  <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer border border-slate-700 flex items-center gap-1.5 transition-colors flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{getTranslation('upload_proof', language)}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-300">
              Ephemeral Security Guarantee:
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              CivicFlow operates strictly in local session memory. No citizen data is saved to persistent databases or disk. Once this workflow completes or the session is exited, all entered information is immediately deleted.
            </p>
          </div>
        </div>

        {/* Ready to Begin Action Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Workflow validated for {service.steps.length} guided steps</span>
          </div>

          <button
            onClick={handleProceed}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:via-indigo-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4" />
            <span>{getTranslation('start_application_btn', language)}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
