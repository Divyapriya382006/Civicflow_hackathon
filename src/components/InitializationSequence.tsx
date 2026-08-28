import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Globe, 
  FileCheck2, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  Laptop
} from 'lucide-react';
import { ServiceWorkflow, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface InitializationSequenceProps {
  service: ServiceWorkflow;
  onComplete: () => void;
  language: SupportedLanguage;
}

interface InitStage {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

export const InitializationSequence: React.FC<InitializationSequenceProps> = ({
  service,
  onComplete,
  language,
}) => {
  const STAGES: InitStage[] = [
    {
      label: 'INITIALIZING SECURE SESSION',
      sublabel: 'Allocating local volatile session memory...',
      icon: <Lock className="w-5 h-5 text-blue-400" />,
    },
    {
      label: 'VALIDATING SERVICE RULES',
      sublabel: `Verifying certified workflow for ${service.title}...`,
      icon: <FileCheck2 className="w-5 h-5 text-cyan-400" />,
    },
    {
      label: 'PREPARING GUIDED STEPS',
      sublabel: `Loaded ${service.steps.length} guided form validation steps...`,
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
    },
    {
      label: 'CONNECTING TO LOCAL LAPTOP BROWSER',
      sublabel: 'Establishing DevTools bridge to real browser on your laptop...',
      icon: <Laptop className="w-5 h-5 text-emerald-400" />,
    },
    {
      label: 'OPENING OFFICIAL PORTAL TAB',
      sublabel: `Targeting official domain: ${service.officialPortal.replace('https://', '').split('/')[0]}...`,
      icon: <Globe className="w-5 h-5 text-teal-400" />,
    },
    {
      label: 'CIVICFLOW READY',
      sublabel: 'All verification checks passed. Commencing workflow...',
      icon: <Sparkles className="w-5 h-5 text-emerald-300" />,
    },
  ];

  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 450);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  const progressPercent = Math.round(((currentStageIndex + 1) / STAGES.length) * 100);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 z-20 relative">
      <div className="max-w-xl w-full p-8 rounded-3xl bg-slate-900/90 border border-blue-500/40 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-teal-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Orbit Ring */}
        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-spin duration-1000"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-teal-400/40 animate-spin duration-700" style={{ animationDirection: 'reverse' }}></div>
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-blue-500/50 flex items-center justify-center shadow-lg shadow-blue-500/20">
            {STAGES[currentStageIndex].icon}
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1 mb-6">
          <h2 className="text-lg font-bold tracking-tight text-white uppercase">
            {STAGES[currentStageIndex].label}
          </h2>
          <p className="text-xs text-slate-400">
            {STAGES[currentStageIndex].sublabel}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 mb-6">
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stage Checklist */}
        <div className="space-y-2 text-left text-xs max-h-48 overflow-y-auto pr-1">
          {STAGES.map((stg, idx) => {
            const isDone = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                    : isDone
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                    : 'bg-slate-950/20 border-slate-900 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                  <span className={isCurrent ? 'font-bold text-white' : ''}>{stg.label}</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {isDone ? 'VERIFIED' : isCurrent ? 'EXECUTING...' : 'PENDING'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
