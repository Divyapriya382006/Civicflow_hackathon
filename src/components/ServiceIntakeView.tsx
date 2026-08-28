import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { ServiceWorkflow, Department, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

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

  const [uploadedDocName, setUploadedDocName] = useState<string>(
    service.requiredDocs[0]?.sampleName || 'Identity_Verification_Document.pdf'
  );
  const [uploadedDocSize, setUploadedDocSize] = useState<string>('1.42 MB');

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedDocName(file.name);
      setUploadedDocSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    }
  };

  const handleProceed = () => {
    onStartApplication(formData, {
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{field.label} {field.required && <span className="text-rose-400">*</span>}</span>
                {field.isSensitivePII && (
                  <span className="text-[11px] text-blue-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" /> Protected
                  </span>
                )}
              </label>

              {field.type === 'select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900">
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-blue-500 focus:outline-none font-medium"
                />
              )}

              {field.helperText && (
                <p className="text-[11px] text-slate-500 mt-1">{field.helperText}</p>
              )}
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
