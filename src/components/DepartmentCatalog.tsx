import React from 'react';
import { 
  Fingerprint, 
  FileCheck, 
  GraduationCap, 
  Car, 
  Landmark, 
  Building2, 
  Briefcase, 
  HeartHandshake, 
  Activity, 
  Wheat, 
  ShoppingBag, 
  Home, 
  Zap, 
  CreditCard, 
  Scale, 
  ChevronRight
} from 'lucide-react';
import { Department, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface DepartmentCatalogProps {
  departments: Department[];
  searchQuery: string;
  onSelectDepartment: (dept: Department) => void;
  language: SupportedLanguage;
}

export const DepartmentCatalog: React.FC<DepartmentCatalogProps> = ({
  departments,
  searchQuery,
  onSelectDepartment,
  language,
}) => {
  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Fingerprint': return <Fingerprint className="w-6 h-6" />;
      case 'FileCheck': return <FileCheck className="w-6 h-6" />;
      case 'GraduationCap': return <GraduationCap className="w-6 h-6" />;
      case 'Car': return <Car className="w-6 h-6" />;
      case 'Landmark': return <Landmark className="w-6 h-6" />;
      case 'Building2': return <Building2 className="w-6 h-6" />;
      case 'Briefcase': return <Briefcase className="w-6 h-6" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6" />;
      case 'Activity': return <Activity className="w-6 h-6" />;
      case 'Wheat': return <Wheat className="w-6 h-6" />;
      case 'ShoppingBag': return <ShoppingBag className="w-6 h-6" />;
      case 'Home': return <Home className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'CreditCard': return <CreditCard className="w-6 h-6" />;
      case 'Scale': return <Scale className="w-6 h-6" />;
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const query = searchQuery.toLowerCase();
    const deptMatch = 
      dept.name.toLowerCase().includes(query) ||
      dept.description.toLowerCase().includes(query) ||
      dept.code.toLowerCase().includes(query);
    const serviceMatch = dept.services.some(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.subtitle.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );
    return deptMatch || serviceMatch;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 z-10 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span>{getTranslation('dept_catalog_title', language)}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-normal">
              {filteredDepartments.length} {getTranslation('available', language)}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {getTranslation('dept_catalog_subtitle', language)}
          </p>
        </div>

        {searchQuery && (
          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Filtering by: <span className="text-blue-400 font-semibold">&quot;{searchQuery}&quot;</span>
          </div>
        )}
      </div>

      {filteredDepartments.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
          <p className="text-sm">No departments matching your search query.</p>
          <p className="text-xs text-slate-500 mt-1">Try searching for &quot;Aadhaar&quot;, &quot;Birth&quot;, &quot;Licence&quot;, or &quot;Income&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => onSelectDepartment(dept)}
              className="group relative p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/50 text-left transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between backdrop-blur-md overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-teal-500/0 group-hover:from-blue-500 group-hover:via-cyan-400 group-hover:to-teal-400 transition-all duration-300" />

              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-blue-600/20 text-blue-400 group-hover:text-blue-300 border border-slate-700/60 group-hover:border-blue-500/40 flex items-center justify-center transition-all duration-200 shadow">
                    {getDeptIcon(dept.iconName)}
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {dept.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors leading-snug mb-1.5">
                  {dept.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                  {dept.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  {dept.services.length} {dept.services.length === 1 ? 'Service' : 'Services'} {getTranslation('available', language)}
                </span>
                <span className="text-blue-400 group-hover:text-blue-300 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-all text-xs">
                  <span>Enter</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
