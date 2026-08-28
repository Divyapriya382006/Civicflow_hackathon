import React, { useState } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  Download, 
  Clock, 
  UserCheck, 
  X
} from 'lucide-react';
import { AuditEvent, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface AuditLedgerViewProps {
  isOpen: boolean;
  onClose: () => void;
  ledger: AuditEvent[];
  language: SupportedLanguage;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  isOpen,
  onClose,
  ledger,
  language,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ledger, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CivicFlow_Verification_Docket_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredEvents = ledger.filter(ev => {
    const matchesSearch = 
      ev.stepTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || ev.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {getTranslation('nav_ledger', language)}
              </h2>
              <p className="text-xs text-slate-400">
                Verified Citizen Activity Docket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Docket</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-200">
                Official Verification Status: Active & Validated
              </span>
              <p className="text-[11px] text-slate-400">
                Total recorded step checkpoints: {ledger.length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search step, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-slate-400 text-xs">Risk:</span>
            {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filterRisk === r 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Event List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No audit checkpoints recorded yet. Run a workflow to populate the verification docket.
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-bold text-[10px] font-mono">
                      #{ev.index}
                    </span>
                    <span className="font-semibold text-slate-200 text-xs">
                      {ev.stepTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400">{ev.timestamp.split('T')[1]?.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] ${
                      ev.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      ev.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {ev.riskLevel}
                    </span>
                    {ev.humanApproved && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Signed
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Target Field:</span> <code className="text-slate-300 font-mono">{ev.target}</code>
                  </div>
                  <div>
                    <span className="text-slate-500">Verification Result:</span> <span className="text-emerald-400 font-medium">{Math.round(ev.confidence * 100)}% ({ev.verificationStatus})</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
