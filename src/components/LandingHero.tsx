import React from 'react';
import { Search, Globe, Shield, Laptop, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { getTranslation } from '../i18n/translations';

interface LandingHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectQuickService: (serviceId: string) => void;
  totalDepartments: number;
  totalServices: number;
  language: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSelectQuickService,
  totalDepartments,
  totalServices,
  language,
  onSelectLanguage,
}) => {
  const popularServices = [
    { label: 'Aadhaar Name Correction', id: 'aadhaar_name_correction', dept: 'Identity' },
    { label: 'Birth Certificate', id: 'crs_birth_certificate', dept: 'Civil Reg' },
    { label: 'National Merit Scholarship', id: 'nsp_merit_scholarship', dept: 'Education' },
    { label: 'Driving Licence Renewal', id: 'parivahan_dl_renewal', dept: 'Transport' },
    { label: 'Income Certificate', id: 'revenue_income_cert', dept: 'Revenue' },
    { label: 'Ayushman Health Card', id: 'pmjay_health_card', dept: 'Health' },
  ];

  return (
    <div className="relative py-10 md:py-16 text-center px-4 max-w-5xl mx-auto z-10">
      {/* Language Selector Banner on Landing Page */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/30 text-blue-300 text-xs backdrop-blur-md shadow-lg">
          <Globe className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-300">
            {getTranslation('nav_select_lang', language)}:
          </span>
          <select
            value={language}
            onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-950 text-white font-bold text-xs px-2 py-0.5 rounded border border-slate-700 focus:outline-none cursor-pointer"
            aria-label="Landing page language selector"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                {lang.flag} {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-emerald-400">{totalDepartments} Departments</span>
          <span className="text-slate-600">•</span>
          <span>{totalServices} Services</span>
        </div>
      </div>

      {/* Main Hero Typography */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-4 leading-none">
        Civic<span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">Flow</span>
      </h1>

      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 mb-3 tracking-tight">
        {getTranslation('hero_title', language)}
      </p>

      <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
        {getTranslation('hero_subtitle', language)}
      </p>

      {/* Global Search Bar */}
      <div className="max-w-2xl mx-auto mb-6 relative">
        <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-slate-900/95 border border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 backdrop-blur-xl transition-all">
          <div className="pl-4 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={getTranslation('hero_search_placeholder', language)}
            className="w-full py-4 pl-3 pr-4 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="mr-3 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Service Suggestions */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-10 text-xs">
        <span className="text-slate-400 font-semibold mr-1">{getTranslation('quick_search', language)}</span>
        {popularServices.map((srv) => (
          <button
            key={srv.id}
            onClick={() => onSelectQuickService(srv.id)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>{srv.label}</span>
            <span className="text-[10px] text-blue-400 font-mono">({srv.dept})</span>
          </button>
        ))}
      </div>

      {/* Citizen Trust & Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto text-left">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-1.5 text-blue-400">
            <Laptop className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Local Browser Control</span>
          </div>
          <p className="text-xs text-slate-400 leading-snug">
            Automates your actual laptop browser on your screen without proxying personal sessions through remote servers.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-1.5 text-emerald-400">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Zero Retention</span>
          </div>
          <p className="text-xs text-slate-400 leading-snug">
            All data resides only in local volatile memory and is permanently purged the instant your session finishes.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-1.5 text-purple-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">User Authorization</span>
          </div>
          <p className="text-xs text-slate-400 leading-snug">
            Every statutory submission and payment action requires your direct, explicit confirmation before execution.
          </p>
        </div>
      </div>
    </div>
  );
};
