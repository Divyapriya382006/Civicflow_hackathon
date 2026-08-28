import React from 'react';
import { 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  X, 
  Globe, 
  CheckCircle2
} from 'lucide-react';
import { PIIToken, ApplicantFormData, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface SecurityVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: PIIToken[];
  applicantData: ApplicantFormData;
  language: SupportedLanguage;
}

export const SecurityVaultModal: React.FC<SecurityVaultModalProps> = ({
  isOpen,
  onClose,
  tokens,
  applicantData,
  language,
}) => {
  if (!isOpen) return null;

  const ALLOWLISTED_DOMAINS = [
    'uidai.gov.in (Unique Identification Authority of India)',
    'crsorgi.gov.in (Civil Registration System of India)',
    'scholarships.gov.in (National Scholarship Portal)',
    'parivahan.gov.in (Ministry of Road Transport & Highways)',
    'pmjay.gov.in (National Health Authority)',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {getTranslation('nav_privacy_vault', language)}
              </h2>
              <p className="text-xs text-slate-400">
                Zero-exposure citizen identity protection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-5 my-4 pr-1 text-xs">
          {/* Architecture Summary */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-200">
            <p className="font-semibold text-blue-300 mb-1">
              Protected Identity Fields:
            </p>
            <p className="text-slate-300 leading-relaxed">
              Your sensitive identity fields are protected in local memory and are never transmitted to external third parties. Values are dispatched directly into the official government portal tab on your laptop screen.
            </p>
          </div>

          {/* Active Field Privacy Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Active Session Field Protection Status
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Display Status</th>
                    <th className="p-2.5">Protection Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {tokens.map((token) => (
                    <tr key={token.rawKey} className="hover:bg-slate-900/40 font-sans">
                      <td className="p-2.5 font-bold text-slate-200">
                        {token.rawKey}
                      </td>
                      <td className="p-2.5 font-mono text-slate-300">
                        {token.maskedDisplay}
                      </td>
                      <td className="p-2.5 text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Protected</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certified Official Portals */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Official Government Domains
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              {ALLOWLISTED_DOMAINS.map((domain, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-300 font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{domain}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
