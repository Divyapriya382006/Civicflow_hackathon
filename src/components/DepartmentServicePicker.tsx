import React, { useState } from 'react';
import { 
  Building2, 
  Fingerprint, 
  FileCheck, 
  GraduationCap, 
  FileText, 
  ShieldCheck, 
  Play, 
  Sparkles, 
  ArrowRight, 
  Upload, 
  Edit3,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';
import { Department, ServiceWorkflow, ApplicantFormData, ScenarioType } from '../types';
import { DEPARTMENTS } from '../data/workflows';

interface DepartmentServicePickerProps {
  selectedDepartment: Department;
  onSelectDepartment: (dept: Department) => void;
  selectedService: ServiceWorkflow;
  onSelectService: (service: ServiceWorkflow) => void;
  applicantData: ApplicantFormData;
  onUpdateApplicantData: (updated: ApplicantFormData) => void;
  onStartExecution: () => void;
  isExecuting: boolean;
  isDryRun: boolean;
}

export const DepartmentServicePicker: React.FC<DepartmentServicePickerProps> = ({
  selectedDepartment,
  onSelectDepartment,
  selectedService,
  onSelectService,
  applicantData,
  onUpdateApplicantData,
  onStartExecution,
  isExecuting,
  isDryRun,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState<ApplicantFormData>(applicantData);

  const handleSaveProfile = () => {
    onUpdateApplicantData(formData);
    setIsEditingProfile(false);
  };

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Fingerprint': return <Fingerprint className="w-5 h-5" />;
      case 'FileCheck': return <FileCheck className="w-5 h-5" />;
      case 'GraduationCap': return <GraduationCap className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
      {/* 1. Department Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1. Select Government Department
          </label>
          <span className="text-[11px] text-slate-400">
            Official Portals Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DEPARTMENTS.map((dept) => {
            const isSelected = selectedDepartment.id === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  onSelectDepartment(dept);
                  if (dept.services.length > 0) {
                    onSelectService(dept.services[0]);
                  }
                }}
                disabled={isExecuting}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {getDeptIcon(dept.iconName)}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">{dept.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{dept.code}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Service Selection & Prerequisite Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2. Verified Workflow Definition
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedService.steps.length} Constrained Steps
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{selectedService.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                WORKFLOW CERTIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">{selectedService.subtitle}</p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-mono">
              <span>Portal: {selectedService.officialPortal}</span>
              <span>•</span>
              <span>Allowed: {selectedService.allowedDomains.join(', ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={onStartExecution}
              disabled={isExecuting}
              className={`px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                isExecuting
                  ? 'bg-blue-800 text-blue-300 cursor-not-allowed opacity-80 animate-pulse'
                  : isDryRun
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
              }`}
            >
              {isExecuting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Agent Executing Steps...</span>
                </>
              ) : isDryRun ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Pre-Flight Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch CivicFlow Agent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Applicant Data & Document Vault Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            3. Applicant Identity & Document Dossier
          </label>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            disabled={isExecuting}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Applicant Dossier'}</span>
          </button>
        </div>

        {isEditingProfile ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Aadhaar / National ID</label>
                <input
                  type="text"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={handleSaveProfile}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Save & Re-Tokenize PII
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">APPLICANT NAME</span>
              <p className="font-semibold text-slate-200 truncate mt-0.5">{applicantData.fullName}</p>
              <span className="text-[9px] text-blue-400 font-mono">Mapped: USER_NAME_42</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">AADHAAR / ID</span>
              <p className="font-semibold text-slate-200 truncate mt-0.5">XXXX-XXXX-3841</p>
              <span className="text-[9px] text-emerald-400 font-mono">AES-256 Encrypted</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">DOCUMENT PROOF</span>
              <p className="font-semibold text-slate-200 truncate mt-0.5">{applicantData.uploadedDocumentName}</p>
              <span className="text-[9px] text-emerald-400 font-mono">HMAC Validated</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">SECURITY TIER</span>
              <p className="font-semibold text-emerald-300 truncate mt-0.5">Hardware KMS</p>
              <span className="text-[9px] text-purple-400 font-mono">Zero Raw PII Exposure</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
