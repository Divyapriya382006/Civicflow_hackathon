import React, { useEffect } from 'react';
import { Globe, Layers, Terminal, AlertCircle } from 'lucide-react';
import { ServiceWorkflow } from '../types';
import { RuntimeEvent } from '../runtime/eventClient';

interface RuntimeBrowserPanelProps {
  service: ServiceWorkflow;
  events: RuntimeEvent[];
  currentStepIndex?: number;
}

export const RuntimeBrowserPanel: React.FC<RuntimeBrowserPanelProps> = ({ service, events, currentStepIndex = 0 }) => {
  const latestObservation = [...events].reverse().find((event) => event.type === 'DOM_OBSERVED');
  const latestAction = [...events].reverse().find((event) => event.type === 'ACTION_EXECUTED');
  
  // Target portal URL
  const portalUrl = service.officialPortal || '/portals/site1_ncs.html#/ncs-registration';
  const urlDisplay = latestObservation?.data?.url ? String(latestObservation.data.url) : portalUrl;

  const currentStep = service.steps[currentStepIndex] || service.steps[0];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md h-full">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Runtime Browser Sandbox</span>
            <p className="text-xs text-slate-400">Playwright-backed test portal iframe</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {latestObservation ? 'OBSERVED' : 'STANDALONE SANDBOX ACTIVE'}
        </span>
      </div>

      {/* URL Address Bar */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 text-xs">
        <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="font-mono text-slate-300 truncate">{urlDisplay}</span>
      </div>

      {/* Embedded Live Portal Iframe View - Full Render Height without scrolling */}
      <div className="relative flex-1 bg-slate-950 min-h-[620px] flex flex-col">
        <iframe
          src={portalUrl}
          title={service.title}
          className="w-full h-[680px] border-0 bg-white shadow-inner"
          data-testid="standalone-portal-iframe"
          style={{ minHeight: '680px' }}
        />

        {/* Action & Observation Status Footer */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
              <Layers className="w-4 h-4 text-blue-400" />
              Active Step Target: <span className="text-white">{currentStep?.title}</span>
            </span>
            <span className="font-mono text-[10px] text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
              {currentStep?.targetSelector || 'data-testid'}
            </span>
          </div>

          {latestAction ? (
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Executed: {String(latestAction.data.action)}</span>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Targeting elements via data-testid for Playwright DOM extraction...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

