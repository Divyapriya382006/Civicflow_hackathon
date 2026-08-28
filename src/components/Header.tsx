import React from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  RotateCcw, 
  LogOut,
  Globe,
  Lock,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Zap
} from 'lucide-react';
import { DynamicScenarioType, SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { getTranslation } from '../i18n/translations';
import { DYNAMIC_SCENARIO_CONFIGS } from '../utils/dynamicScenario';

interface HeaderProps {
  currentScenario: DynamicScenarioType;
  onSelectScenario: (scenario: DynamicScenarioType) => void;
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onOpenVault: () => void;
  onOpenLedger: () => void;
  onReset: () => void;
  onReturnToCatalog?: () => void;
  isRunning: boolean;
  totalAuditCount: number;
  isInWorkspace?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScenario,
  onSelectScenario,
  language,
  onSelectLanguage,
  onOpenVault,
  onOpenLedger,
  onReset,
  onReturnToCatalog,
  isRunning,
  totalAuditCount,
  isInWorkspace = false,
}) => {
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const scenarioList: DynamicScenarioType[] = [
    'PASS_100',
    'ANOMALY_DETECTED',
    'CONTRADICTION_ALERT',
    'ATTACK_QUARANTINED',
    'ZERO_MUTATION_AUDIT',
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 sticky top-0 z-40 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Mission Statement */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div 
            onClick={onReturnToCatalog}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-teal-500 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  CivicFlow
                </span>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-sans uppercase">
                  {getTranslation('gov_badge', language)}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                {getTranslation('brand_tagline', language)}
              </p>
            </div>
          </div>

          {/* Language Selector Dropdown (Responsive) */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-xs">
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
                aria-label={getTranslation('nav_select_lang', language)}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                    {lang.flag} {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center: Dynamic Adaptive Scenario Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden lg:inline">
            {getTranslation('nav_scenario', language)}:
          </span>
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {scenarioList.map((scType) => {
              const config = DYNAMIC_SCENARIO_CONFIGS[scType];
              const active = currentScenario === scType;
              return (
                <button
                  key={scType}
                  onClick={() => onSelectScenario(scType)}
                  disabled={isRunning}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {scType === 'PASS_100' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  {scType === 'ANOMALY_DETECTED' && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
                  {scType === 'CONTRADICTION_ALERT' && <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />}
                  {scType === 'ATTACK_QUARANTINED' && <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />}
                  {scType === 'ZERO_MUTATION_AUDIT' && <Search className="w-3.5 h-3.5 text-cyan-300" />}
                  <span>{config.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls & Navigation (Citizen Friendly, No Jargon) */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Privacy & Identity Shield */}
          <button
            onClick={onOpenVault}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{getTranslation('nav_privacy_vault', language)}</span>
            <span className="sm:hidden">Privacy</span>
          </button>

          {/* Citizen Verification Ledger */}
          <button
            onClick={onOpenLedger}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{getTranslation('nav_ledger', language)}</span>
            <span className="sm:hidden">Docket</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              {totalAuditCount}
            </span>
          </button>

          {isInWorkspace && onReturnToCatalog && (
            <button
              onClick={onReturnToCatalog}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-600/50 text-slate-300 hover:text-rose-300 font-medium flex items-center gap-1.5 transition-colors"
              title={getTranslation('nav_exit', language)}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{getTranslation('nav_exit', language)}</span>
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={onReset}
            disabled={isRunning}
            className="text-xs p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title={getTranslation('nav_restart', language)}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
