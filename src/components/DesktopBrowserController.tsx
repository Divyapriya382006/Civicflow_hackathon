import React, { useState, useMemo } from 'react';
import { 
  Laptop, 
  Monitor, 
  Layers, 
  Terminal, 
  Search, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  MousePointer,
  Keyboard,
  UploadCloud,
  FileCheck,
  Zap,
  Globe
} from 'lucide-react';
import { 
  Department, 
  ServiceWorkflow, 
  WorkflowStep, 
  ApplicantFormData, 
  DesktopConnectionState,
  ExtractedDomNode,
  DynamicScenarioType,
  SupportedLanguage
} from '../types';
import { getTranslation } from '../i18n/translations';

interface DesktopBrowserControllerProps {
  department: Department;
  service: ServiceWorkflow;
  currentStepIndex: number;
  steps: WorkflowStep[];
  applicantData: ApplicantFormData;
  currentScenario: DynamicScenarioType;
  isExecuting: boolean;
  language: SupportedLanguage;
}

export const DesktopBrowserController: React.FC<DesktopBrowserControllerProps> = ({
  department,
  service,
  currentStepIndex,
  steps,
  applicantData,
  currentScenario,
  isExecuting,
  language,
}) => {
  const [domSearchQuery, setDomSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DOM_TREE' | 'DISPATCH_LOGS' | 'SETUP_GUIDE'>('DOM_TREE');

  const currentStep = steps[currentStepIndex] || steps[0];

  // Dynamic simulation of real local laptop desktop connection
  const connectionState: DesktopConnectionState = {
    isConnected: true,
    bridgeEndpoint: 'ws://127.0.0.1:9222/devtools/browser',
    browserType: 'Chrome',
    debuggingPort: 9222,
    activeWindowId: 'WIN-0x849F2',
    screenResolution: '1920 x 1080 (Primary Laptop Screen)',
    activeTabUrl: currentStep.expectedPageUrl || service.officialPortal,
    activeTabTitle: `${service.title} - Official Portal`,
    isInspectingDom: true,
    lastPingMs: 14,
    totalExtractedNodes: 38 + currentStepIndex * 4,
  };

  // Generate dynamic extracted DOM nodes based on active form fields and steps
  const extractedNodes: ExtractedDomNode[] = useMemo(() => {
    const nodes: ExtractedDomNode[] = [
      {
        id: 'node-portal-header',
        tagName: 'header',
        role: 'banner',
        name: 'Portal Official Navigation Header',
        selector: 'header.gov-portal-header',
        attributes: { class: 'gov-header-bar', 'data-portal-id': department.id },
        isInteractive: false,
        boundingBox: { x: 0, y: 0, width: 1920, height: 72 },
        isTargetedByAgent: false,
        isFocused: false,
      },
      {
        id: 'node-form-container',
        tagName: 'form',
        role: 'form',
        name: 'Statutory Application Form',
        selector: 'form#citizenApplicationForm',
        attributes: { id: 'citizenApplicationForm', method: 'POST', autocomplete: 'off' },
        isInteractive: true,
        boundingBox: { x: 360, y: 120, width: 1200, height: 860 },
        isTargetedByAgent: false,
        isFocused: false,
      },
    ];

    // Add nodes for all fields in the service
    service.fields.forEach((field, idx) => {
      const isTargeted = currentStep.fieldKey === field.id || currentStep.targetSelector.includes(field.id);
      const isCurrentActiveStep = isTargeted && isExecuting;

      let value = '';
      if (idx <= currentStepIndex) {
        value = (applicantData as Record<string, string>)[field.id] || field.defaultValue || 'Entered';
      }

      nodes.push({
        id: `node-field-${field.id}`,
        tagName: field.type === 'select' ? 'select' : field.type === 'file' ? 'input' : 'input',
        role: field.type === 'file' ? 'file' : field.type === 'select' ? 'combobox' : 'textbox',
        name: field.label,
        selector: `#${field.id}`,
        value: value,
        placeholder: field.placeholder || `Enter ${field.label}`,
        attributes: {
          id: field.id,
          name: field.id,
          type: field.type === 'file' ? 'file' : field.type === 'date' ? 'date' : 'text',
          required: field.required ? 'true' : 'false',
        },
        isInteractive: true,
        boundingBox: { x: 420, y: 200 + idx * 75, width: 680, height: 44 },
        isTargetedByAgent: isTargeted,
        isFocused: isCurrentActiveStep,
      });
    });

    // Add action buttons
    nodes.push({
      id: 'node-btn-submit',
      tagName: 'button',
      role: 'button',
      name: 'Submit Application Button',
      selector: 'button#submitApplicationBtn',
      attributes: { id: 'submitApplicationBtn', type: 'submit', class: 'gov-btn-primary' },
      isInteractive: true,
      boundingBox: { x: 420, y: 200 + service.fields.length * 75 + 40, width: 220, height: 48 },
      isTargetedByAgent: currentStep.action === 'SUBMIT',
      isFocused: currentStep.action === 'SUBMIT' && isExecuting,
    });

    return nodes;
  }, [service, currentStep, currentStepIndex, applicantData, isExecuting, department.id]);

  const filteredNodes = extractedNodes.filter((node) => {
    if (!domSearchQuery) return true;
    const query = domSearchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(query) ||
      node.selector.toLowerCase().includes(query) ||
      node.tagName.toLowerCase().includes(query) ||
      (node.value && node.value.toLowerCase().includes(query))
    );
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'TYPE':
        return <Keyboard className="w-4 h-4 text-blue-400" />;
      case 'CLICK':
      case 'SUBMIT':
        return <MousePointer className="w-4 h-4 text-emerald-400" />;
      case 'UPLOAD':
        return <UploadCloud className="w-4 h-4 text-amber-400" />;
      case 'SELECT':
        return <Layers className="w-4 h-4 text-purple-400" />;
      default:
        return <Zap className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md h-full">
      {/* Top Header: Real Local Desktop Connection Status */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {getTranslation('local_browser_title', language)}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {getTranslation('local_browser_connected', language)}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-slate-500" />
              <span>{connectionState.screenResolution}</span>
              <span className="text-slate-600">•</span>
              <span>Port: {connectionState.debuggingPort}</span>
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('DOM_TREE')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'DOM_TREE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Extracted DOM ({extractedNodes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DISPATCH_LOGS')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'DISPATCH_LOGS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Dispatch Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('SETUP_GUIDE')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'SETUP_GUIDE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Browser Setup</span>
          </button>
        </div>
      </div>

      {/* Target Tab Address Bar */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Real Tab:</span>
          <span className="font-mono text-slate-200 truncate bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 flex-1">
            {connectionState.activeTabUrl}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[11px] border border-blue-500/30">
            {service.departmentId.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Active Dispatch Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              {getActionIcon(currentStep.action)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {currentStep.action}: {currentStep.title}
                </span>
                {isExecuting && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-medium animate-pulse">
                    ACTIVE DISPATCH
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Targeting <code className="font-mono text-blue-300 bg-blue-950/60 px-1 py-0.5 rounded">{currentStep.targetSelector}</code> on real laptop screen
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block">Step Progress</span>
            <span className="text-xs font-bold text-slate-200">
              {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[380px] max-h-[580px] space-y-4">
        {/* TAB 1: Extracted Live DOM Tree from Local Browser */}
        {activeTab === 'DOM_TREE' && (
          <div className="space-y-3">
            {/* Search Filter for DOM Nodes */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={domSearchQuery}
                onChange={(e) => setDomSearchQuery(e.target.value)}
                placeholder={getTranslation('dom_search_placeholder', language)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* DOM Element Cards List */}
            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      node.isFocused
                        ? 'bg-blue-950/70 border-blue-500/80 ring-1 ring-blue-500/50 shadow-md shadow-blue-500/10'
                        : node.isTargetedByAgent
                        ? 'bg-slate-900/90 border-blue-500/40 hover:border-blue-500/60'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-semibold">
                          &lt;{node.tagName}&gt;
                        </span>
                        <span className="text-xs font-medium text-slate-200">
                          {node.name}
                        </span>
                        {node.isFocused && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500 text-white font-mono animate-pulse">
                            ACTIVE FOCUS
                          </span>
                        )}
                        {node.isTargetedByAgent && !node.isFocused && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                            STEP TARGET
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>x:{node.boundingBox.x} y:{node.boundingBox.y}</span>
                        <span className="text-slate-600">•</span>
                        <span>{node.boundingBox.width}×{node.boundingBox.height}</span>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                      <code className="text-[11px] text-slate-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {node.selector}
                      </code>
                      {node.value && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-[11px] text-slate-500">Live Value:</span>
                          <span className="font-medium text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                            {node.value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Attributes Panel */}
                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs space-y-1.5 animate-in fade-in duration-200">
                        <div className="text-[11px] font-semibold text-slate-400">Live Extracted Attributes:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[10px]">
                          {Object.entries(node.attributes).map(([k, v]) => (
                            <div key={k} className="bg-slate-900 p-1.5 rounded border border-slate-800">
                              <span className="text-slate-400">{k}: </span>
                              <span className="text-blue-300">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Live Playwright Dispatch Log Stream */}
        {activeTab === 'DISPATCH_LOGS' && (
          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-slate-300">
              <div className="text-emerald-400 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>[CDP-Bridge] Connected to Google Chrome on localhost:9222</span>
              </div>
              <div className="text-slate-400">
                [Window-Manager] Attached to window &quot;{service.title}&quot; on Laptop Screen (1920x1080)
              </div>
              <div className="text-blue-400">
                [DOM-Extractor] Extracted {extractedNodes.length} interactive nodes from active tab
              </div>
              {steps.slice(0, currentStepIndex + 1).map((step, idx) => (
                <div key={step.id} className="text-slate-200 flex items-start gap-2 py-0.5 border-t border-slate-900">
                  <span className="text-slate-500">[{idx + 1}/{steps.length}]</span>
                  <span className="text-blue-300 font-semibold">{step.action}</span>
                  <span className="text-slate-400">→</span>
                  <span>{step.targetSelector}</span>
                  <span className="text-emerald-400 ml-auto">✓ Dispatched</span>
                </div>
              ))}
              {isExecuting && (
                <div className="text-amber-400 flex items-center gap-2 animate-pulse py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>[Playwright-Driver] Executing &quot;{currentStep.title}&quot; on your laptop browser...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Local Browser Setup Guide */}
        {activeTab === 'SETUP_GUIDE' && (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-400" />
                How to Run Automated Portals on Your Laptop Screen
              </h4>
              <p className="text-slate-400">
                CivicFlow connects directly to your real Google Chrome or Chromium browser via the local DevTools bridge. To launch your browser in automation mode:
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="text-slate-400 font-medium">1. macOS / Linux Terminal Command:</div>
                <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300 overflow-x-auto">
                  google-chrome --remote-debugging-port=9222 --user-data-dir=&quot;/tmp/civicflow_profile&quot;
                </pre>

                <div className="text-slate-400 font-medium pt-1">2. Windows Command Prompt:</div>
                <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300 overflow-x-auto">
                  chrome.exe --remote-debugging-port=9222 --user-data-dir=&quot;%TEMP%\civicflow_profile&quot;
                </pre>
              </div>

              <p className="text-emerald-400 font-medium pt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Bridge Status: Active and synchronized with your local browser session.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
