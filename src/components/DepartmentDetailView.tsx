import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Building2,
  Fingerprint,
  FileCheck,
  GraduationCap,
  Car,
  Landmark,
  Briefcase,
  HeartHandshake,
  Activity,
  Wheat,
  ShoppingBag,
  Home,
  Zap,
  CreditCard,
  Scale
} from 'lucide-react';
import { Department, ServiceWorkflow, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface DepartmentDetailViewProps {
  department: Department;
  onBack: () => void;
  onSelectService: (service: ServiceWorkflow) => void;
  language: SupportedLanguage;
}

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  onBack,
  onSelectService,
  language,
}) => {
  const [serviceSearch, setServiceSearch] = useState('');

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Fingerprint': return <Fingerprint className="w-8 h-8" />;
      case 'FileCheck': return <FileCheck className="w-8 h-8" />;
      case 'GraduationCap': return <GraduationCap className="w-8 h-8" />;
      case 'Car': return <Car className="w-8 h-8" />;
      case 'Landmark': return <Landmark className="w-8 h-8" />;
      case 'Building2': return <Building2 className="w-8 h-8" />;
      case 'Briefcase': return <Briefcase className="w-8 h-8" />;
      case 'HeartHandshake': return <HeartHandshake className="w-8 h-8" />;
      case 'Activity': return <Activity className="w-8 h-8" />;
      case 'Wheat': return <Wheat className="w-8 h-8" />;
      case 'ShoppingBag': return <ShoppingBag className="w-8 h-8" />;
      case 'Home': return <Home className="w-8 h-8" />;
      case 'Zap': return <Zap className="w-8 h-8" />;
      case 'CreditCard': return <CreditCard className="w-8 h-8" />;
      case 'Scale': return <Scale className="w-8 h-8" />;
      default: return <Building2 className="w-8 h-8" />;
    }
  };

  const filteredServices = department.services.filter((s) => {
    const q = serviceSearch.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.whatItDoes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 z-10 relative animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Back Button & Breadcrumbs */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{getTranslation('back_to_catalog', language)}</span>
        </button>

        <div className="text-[11px] font-mono text-slate-500">
          Official Domain: <span className="text-slate-300">{department.portalUrl}</span>
        </div>
      </div>

      {/* Department Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/10">
              {getDeptIcon(department.iconName)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {department.name}
                </h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {department.code}
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {department.description}
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end gap-2 flex-shrink-0 w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
            <span className="text-xs font-mono text-slate-400">Certified Services</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {department.services.length} {getTranslation('available', language)}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder={`Search ${department.name.split(' ')[0]} services...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="text-xs text-slate-400 self-end sm:self-center">
          Showing {filteredServices.length} of {department.services.length} services
        </div>
      </div>

      {/* Services List Grid */}
      <div className="space-y-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-blue-500/40 transition-all duration-200 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700">
                  {service.category}
                </span>
                <h3 className="text-lg font-bold text-white leading-snug">
                  {service.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {service.whatItDoes}
              </p>

              {/* Requirement highlights */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Est. {service.estimatedMinutes} mins</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{service.requiredDocs.length} Document Required</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Human Officer Sign-off on Final Step</span>
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <button
                onClick={() => onSelectService(service)}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                <span>{getTranslation('start_application_btn', language)}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
