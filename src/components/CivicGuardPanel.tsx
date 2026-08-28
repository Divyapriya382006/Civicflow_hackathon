import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  RefreshCw,
  Eye,
  ShieldAlert,
  Search,
  Check,
  Zap,
  Lock
} from 'lucide-react';
import { 
  CivicGuardSignals, 
  WorkflowStep, 
  ContradictionItem, 
  DynamicScenarioType,
  SupportedLanguage 
} from '../types';
import { getTranslation } from '../i18n/translations';

interface CivicGuardPanelProps {
  signals: CivicGuardSignals;
  currentStep: WorkflowStep;
  currentStepIndex: number;
  totalSteps: number;
  contradiction: ContradictionItem | null;
  onResolveContradiction: () => void;
  onRemapDrift: () => void;
  onQuarantineAttack?: () => void;
  currentScenario: DynamicScenarioType;
  isExecuting: boolean;
  language: SupportedLanguage;
}

export const CivicGuardPanel: React.FC<CivicGuardPanelProps> = ({
  signals,
  currentStep,
  currentStepIndex,
  totalSteps,
  contradiction,
  onResolveContradiction,
  onRemapDrift,
  onQuarantineAttack,
  currentScenario,
  isExecuting,
  language,
}) => {
  const compositePercentage = Math.round(signals.compositeConfidence * 100);

  // Confidence category color & status
  let scoreColor = 'text-emerald-400 border-emerald-500 bg-emerald-950/40';
  let scoreLabel = 'OPTIMAL (Autonomous Flow)';
  if (compositePercentage < 65) {
    scoreColor = 'text-rose-400 border-rose-500 bg-rose-950/40';
    scoreLabel = 'SAFETY HOLD (Intervention Required)';
  } else if (compositePercentage < 90) {
    scoreColor = 'text-amber-400 border-amber-500 bg-amber-950/40';
    scoreLabel = 'REVIEW (User Confirmation Required)';
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col gap-4 backdrop-blur-md h-full">
      {/* Header with CivicGuard Branding */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              {getTranslation('civicguard_title', language)}
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time multi-signal consensus engine
            </p>
          </div>
        </div>

        {/* Live Confidence Badge */}
        <div className="text-right">
          <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold font-mono inline-flex items-center gap-1.5 ${scoreColor}`}>
            <span>{compositePercentage}%</span>
            <span className="text-[10px] font-sans font-medium hidden sm:inline">
              Score
            </span>
          </div>
        </div>
      </div>

      {/* 5 Real-Time Verification Signals */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span>5-Signal Verification Consensus</span>
          <span className="text-[10px] text-slate-400 font-medium">Real-Time</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center">
          {/* Signal 1: Portal Match */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {getTranslation('signal_portal', language)}
            </p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round(signals.domMatch * 100)}%
            </p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${signals.domMatch * 100}%` }}
              />
            </div>
          </div>

          {/* Signal 2: Field Value */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {getTranslation('signal_field', language)}
            </p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round(signals.pageText * 100)}%
            </p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${signals.pageText * 100}%` }}
              />
            </div>
          </div>

          {/* Signal 3: Visual Consistency */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {getTranslation('signal_visual', language)}
            </p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round(signals.visualMatch * 100)}%
            </p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${signals.visualMatch * 100}%` }}
              />
            </div>
          </div>

          {/* Signal 4: Workflow State */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {getTranslation('signal_state', language)}
            </p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round(signals.workflowState * 100)}%
            </p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${signals.workflowState * 100}%` }}
              />
            </div>
          </div>

          {/* Signal 5: Action Result */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {getTranslation('signal_outcome', language)}
            </p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round(signals.actionResult * 100)}%
            </p>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${signals.actionResult * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC SCENARIO BANNERS */}

      {/* 1. Anomaly Detected Banner */}
      {currentScenario === 'ANOMALY_DETECTED' && (
        <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/70 text-amber-200 text-xs flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold">{getTranslation('anomaly_banner_title', language)}</span>
          </div>
          <p className="text-[11px] text-amber-300">
            {getTranslation('anomaly_banner_desc', language)}
          </p>
          <div className="flex justify-end mt-1">
            <button
              onClick={onRemapDrift}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{getTranslation('remap_button', language)}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Contradiction Alert Banner */}
      {currentScenario === 'CONTRADICTION_ALERT' && contradiction && !contradiction.resolved && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-bold">{getTranslation('contradiction_banner_title', language)}</span>
          </div>
          <p className="text-[11px] text-rose-300">
            {contradiction.reason} (User: <span className="font-mono">{contradiction.userValue}</span> vs Doc: <span className="font-mono">{contradiction.documentValue}</span>)
          </p>
          <div className="flex justify-end mt-1">
            <button
              onClick={onResolveContradiction}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{getTranslation('resolve_contradiction', language)}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Attack Quarantined Banner */}
      {currentScenario === 'ATTACK_QUARANTINED' && (
        <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-500/70 text-purple-200 text-xs flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-bold">{getTranslation('attack_banner_title', language)}</span>
          </div>
          <p className="text-[11px] text-purple-300">
            {getTranslation('attack_banner_desc', language)}
          </p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] font-mono text-purple-400 font-semibold bg-purple-900/60 px-2 py-0.5 rounded">
              STATE: ISOLATED
            </span>
            {onQuarantineAttack && (
              <button
                onClick={onQuarantineAttack}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow"
              >
                Clear Threat & Resume
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Zero-Mutation Audit Mode Banner */}
      {currentScenario === 'ZERO_MUTATION_AUDIT' && (
        <div className="p-3.5 rounded-xl bg-cyan-950/70 border border-cyan-500/60 text-cyan-200 text-xs flex flex-col gap-1.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="font-bold">{getTranslation('zero_mutation_banner_title', language)}</span>
          </div>
          <p className="text-[11px] text-cyan-300">
            {getTranslation('zero_mutation_banner_desc', language)}
          </p>
        </div>
      )}

      {/* Privacy & Safe Execution Guarantee Banner */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">Local Memory Shield:</span>
            <span className="text-[11px] text-slate-400 block">
              Identity data is never stored on external cloud servers.
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
          SECURE
        </span>
      </div>

      {/* Step Explanation & Evidence Box */}
      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-2 flex-1">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Operational Rationale ({getTranslation('step_indicator', language)} {currentStepIndex + 1} {getTranslation('of', language)} {totalSteps})
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {currentStep.action}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-blue-400">Why this action: </span>
          <span className="text-slate-300">{currentStep.explanation.why}</span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-emerald-400">Verified Evidence:</span>
          <ul className="mt-1 space-y-1">
            {currentStep.explanation.evidence.map((ev, i) => (
              <li key={i} className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>{ev}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
