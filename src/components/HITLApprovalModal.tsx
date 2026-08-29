import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Fingerprint, 
  FileText, 
  Lock
} from 'lucide-react';
import { WorkflowStep, RiskLevel, ApplicantFormData, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface HITLApprovalModalProps {
  isOpen: boolean;
  step: WorkflowStep;
  currentStepIndex: number;
  totalSteps: number;
  applicantData: ApplicantFormData;
  compositeConfidence: number;
  onApprove: (officerNotes: string) => void;
  onReject: () => void;
  language: SupportedLanguage;
}

export const HITLApprovalModal: React.FC<HITLApprovalModalProps> = ({
  isOpen,
  step,
  currentStepIndex,
  totalSteps,
  applicantData,
  compositeConfidence,
  onApprove,
  onReject,
  language,
}) => {
  const [officerNotes, setOfficerNotes] = useState('Authorized by Civil Registrar / Nodal Officer.');
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen) return null;

  const handleSignAndApprove = () => {
    setIsSigning(true);
    onApprove(officerNotes);
    setIsSigning(false);
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Control Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {getTranslation('hitl_title', language)}
              </h2>
              <p className="text-xs text-amber-400/80 font-medium">
                {getTranslation('hitl_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getRiskBadge(step.riskLevel)}`}>
              {step.riskLevel} RISK
            </span>
          </div>
        </div>

        {/* Step Info Card */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{getTranslation('step_indicator', language)} {currentStepIndex + 1} {getTranslation('of', language)} {totalSteps}</span>
            <span>ACTION: {step.action}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Action Description</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">{step.title}</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Target Element</span>
              <p className="font-mono text-emerald-400 text-xs bg-slate-900 p-1.5 rounded mt-0.5">
                {step.targetElementLabel} ({step.targetSelector})
              </p>
            </div>

            {step.action === 'UPLOAD' && (
              <div>
                <span className="text-[11px] text-slate-400 uppercase block">Document Proof</span>
                <p className="text-slate-200 flex items-center gap-1.5 mt-0.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  {applicantData.uploadedDocumentName} (Size: {applicantData.uploadedDocumentSize})
                </p>
              </div>
            )}

            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Statutory Policy</span>
              <p className="text-slate-300 mt-0.5">{step.explanation.policyRule}</p>
            </div>
          </div>

          {/* Evidence Checklist */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">SECURITY</span>
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">PORTAL MATCH</span>
              <span className="text-blue-400 font-bold font-mono text-sm mt-0.5 block">98.4%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">CONFIDENCE</span>
              <span className="text-emerald-400 font-bold font-mono text-sm mt-0.5 block">
                {Math.round(compositeConfidence * 100)}%
              </span>
            </div>
          </div>

          {/* Officer Signature Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Officer Authorization Notes:
            </label>
            <input
              type="text"
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onReject}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>{getTranslation('hitl_reject', language)}</span>
          </button>

          <button
            onClick={handleSignAndApprove}
            disabled={isSigning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <Fingerprint className="w-4 h-4 text-emerald-200" />
            <span>{isSigning ? 'Authorizing...' : getTranslation('hitl_approve', language)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
