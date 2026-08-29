import React from 'react';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Eye, 
  UserCheck, 
  Zap,
  CornerDownRight
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { RuntimeEvent } from '../runtime/eventClient';

interface LangGraphViewerProps {
  events: RuntimeEvent[];
  isPausedForHITL: boolean;
  language: SupportedLanguage;
}

export const LangGraphViewer: React.FC<LangGraphViewerProps> = ({
  events,
  isPausedForHITL,
}) => {
  const latestStarted = [...events].reverse().find((event) => event.type === 'NODE_STARTED')?.node_id;
  const completedNodes = new Set(events.filter((event) => event.type === 'NODE_COMPLETED').map((event) => event.node_id));

  let activeNode = 'observe';
  if (latestStarted) {
    if (latestStarted.includes('observe')) activeNode = 'observe';
    else if (latestStarted.includes('analyze')) activeNode = 'analyze_and_decide';
    else if (latestStarted.includes('vision')) activeNode = 'vision_fallback';
    else if (latestStarted.includes('user') || latestStarted.includes('hitl')) activeNode = 'user_confirmation';
    else if (latestStarted.includes('act')) activeNode = 'act';
  } else if (events.some(e => e.type === 'HITL_REQUIRED')) {
    activeNode = 'user_confirmation';
  }

  // Red = Completed, Green = In Progress (Active), Plain Slate = Pending
  const getNodeStatus = (nodeId: string) => {
    const isNodeCompleted = completedNodes.has(nodeId) || 
      (nodeId === 'observe' && events.some(e => e.type === 'DOM_OBSERVED')) ||
      (nodeId === 'analyze_and_decide' && events.some(e => e.type === 'DECISION_CREATED')) ||
      (nodeId === 'act' && events.some(e => e.type === 'ACTION_EXECUTED'));

    const isActive = activeNode === nodeId;

    if (isActive) {
      return {
        bgClass: 'bg-emerald-950/90 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/20 animate-pulse',
        badgeClass: 'bg-emerald-500 text-slate-950 font-bold',
        badgeText: 'IN PROGRESS',
        stroke: '#10b981',
      };
    } else if (isNodeCompleted) {
      return {
        bgClass: 'bg-red-950/60 border-red-500/80 text-red-100',
        badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/40',
        badgeText: 'COMPLETED',
        stroke: '#ef4444',
      };
    } else {
      return {
        bgClass: 'bg-slate-950/70 border-slate-800 text-slate-400 opacity-60',
        badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
        badgeText: 'PENDING',
        stroke: '#475569',
      };
    }
  };

  const observeState = getNodeStatus('observe');
  const analyzeState = getNodeStatus('analyze_and_decide');
  const visionState = getNodeStatus('vision_fallback');
  const userState = getNodeStatus('user_confirmation');
  const actState = getNodeStatus('act');

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-4 shadow-2xl backdrop-blur-md">
      {/* Top Header & Color Legend */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide">
            LangGraph State Machine Flowchart
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> In Progress (Green)
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Completed (Red)
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span> Pending (Plain)
          </span>
        </div>
      </div>

      {/* SVG Diagram with Exact Crisp Directed Edge Connectors & Arrowheads matching the user's flowchart image */}
      <div className="relative w-full overflow-x-auto flex flex-col items-center">
        <svg 
          viewBox="0 0 540 680" 
          className="w-full max-w-[500px] h-auto font-sans select-none"
        >
          <defs>
            {/* Marker Definitions for Directed Arrow Edges */}
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* EDGE 1: Start -> observe() */}
          <line x1="270" y1="42" x2="270" y2="70" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* EDGE 2: observe() -> analyze_and_decide() */}
          <line x1="270" y1="160" x2="270" y2="190" stroke={observeState.stroke} strokeWidth="2" markerEnd="url(#arrow)" />

          {/* EDGE 3: analyze_and_decide() -> should_continue() */}
          <line x1="270" y1="280" x2="270" y2="310" stroke={analyzeState.stroke} strokeWidth="2" markerEnd="url(#arrow)" />

          {/* EDGE 4: should_continue() -> vision_fallback() [Left Branch] */}
          <path d="M 220 360 L 140 360 L 140 400" fill="none" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrow)" />
          <rect x="145" y="348" width="85" height="18" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
          <text x="187" y="361" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="middle">REQUEST_VISION</text>

          {/* EDGE 5: should_continue() -> user_confirmation() [Right Branch] */}
          <path d="M 320 360 L 400 360 L 400 400" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
          <rect x="310" y="348" width="80" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
          <text x="350" y="361" fill="#fbbf24" fontSize="9" fontWeight="bold" textAnchor="middle">CONFIRM_USER</text>

          {/* EDGE 6: should_continue() -> act() [Default Straight Branch] */}
          <path d="M 270 410 L 270 510" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
          <rect x="245" y="445" width="50" height="18" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
          <text x="270" y="458" fill="#60a5fa" fontSize="9" fontWeight="bold" textAnchor="middle">Default</text>

          {/* EDGE 7: vision_fallback() -> analyze_and_decide() [Loop back UP] */}
          <path d="M 140 490 L 140 505 L 45 505 L 45 235 L 140 235" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />

          {/* EDGE 8: user_confirmation() -> act() */}
          <path d="M 400 490 L 400 545 L 390 545" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* EDGE 9: act() -> End (COMPLETE) */}
          <path d="M 200 580 L 120 580 L 120 625" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
          <rect x="125" y="570" width="60" height="18" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
          <text x="155" y="583" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">COMPLETE</text>

          {/* EDGE 10: act() -> observe() [Loop back UP Right Side] */}
          <path d="M 390 560 L 515 560 L 515 115 L 400 115" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#arrow-emerald)" />


          {/* NODE: Start */}
          <g transform="translate(210, 10)">
            <rect width="120" height="32" rx="16" fill="#020617" stroke="#475569" strokeWidth="2" />
            <text x="60" y="21" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">Start</text>
          </g>

          {/* NODE: observe() */}
          <foreignObject x="140" y="70" width="260" height="90">
            <div className={`p-2.5 rounded-xl border h-full transition-all duration-300 ${observeState.bgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-white">observe()</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${observeState.badgeClass}`}>{observeState.badgeText}</span>
              </div>
              <ul className="text-[9px] text-slate-300 space-y-0.5 pl-2 list-disc opacity-90">
                <li>Start browser (if needed)</li>
                <li>Navigate to portal URL</li>
                <li>Extract DOM elements</li>
              </ul>
            </div>
          </foreignObject>

          {/* NODE: analyze_and_decide() */}
          <foreignObject x="140" y="190" width="260" height="90">
            <div className={`p-2.5 rounded-xl border h-full transition-all duration-300 ${analyzeState.bgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-white">analyze_and_decide()</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${analyzeState.badgeClass}`}>{analyzeState.badgeText}</span>
              </div>
              <ul className="text-[9px] text-slate-300 space-y-0.5 pl-2 list-disc opacity-90">
                <li>Build prompt (goal + history + DOM)</li>
                <li>Call LLM (Ollama)</li>
                <li>Extract ACTION</li>
              </ul>
            </div>
          </foreignObject>

          {/* NODE: should_continue() (Diamond) */}
          <g transform="translate(270, 360)">
            <polygon points="0,-50 60,0 0,50 -60,0" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
            <text x="0" y="-5" fill="#93c5fd" fontSize="11" fontWeight="bold" textAnchor="middle">should_continue()</text>
            <text x="0" y="12" fill="#60a5fa" fontSize="8" textAnchor="middle">Evaluator</text>
          </g>

          {/* NODE: vision_fallback() */}
          <foreignObject x="50" y="400" width="180" height="90">
            <div className={`p-2 rounded-xl border h-full transition-all duration-300 ${visionState.bgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold flex items-center gap-1 text-purple-300"><Eye className="w-3 h-3" /> vision_fallback()</span>
                <span className={`text-[7px] font-mono px-1 py-0.5 rounded ${visionState.badgeClass}`}>{visionState.badgeText}</span>
              </div>
              <ul className="text-[8px] text-slate-300 space-y-0.5 pl-2 list-disc opacity-90">
                <li>Take screenshot</li>
                <li>Run vision model</li>
                <li>Add vision_analysis</li>
              </ul>
            </div>
          </foreignObject>

          {/* NODE: user_confirmation() */}
          <foreignObject x="310" y="400" width="180" height="90">
            <div className={`p-2 rounded-xl border h-full transition-all duration-300 ${userState.bgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold flex items-center gap-1 text-amber-300"><UserCheck className="w-3 h-3" /> user_confirmation()</span>
                <span className={`text-[7px] font-mono px-1 py-0.5 rounded ${userState.badgeClass}`}>{userState.badgeText}</span>
              </div>
              <ul className="text-[8px] text-slate-300 space-y-0.5 pl-2 list-disc opacity-90">
                <li>Ask user approval</li>
                <li>Wait/assume confirm</li>
              </ul>
            </div>
          </foreignObject>

          {/* NODE: act() */}
          <foreignObject x="140" y="510" width="250" height="85">
            <div className={`p-2.5 rounded-xl border h-full transition-all duration-300 ${actState.bgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-white">act()</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${actState.badgeClass}`}>{actState.badgeText}</span>
              </div>
              <ul className="text-[9px] text-slate-300 space-y-0.5 pl-2 list-disc opacity-90">
                <li>CLICK(selector) / TYPE(selector, text)</li>
                <li>NAVIGATE(url) / Update status</li>
              </ul>
            </div>
          </foreignObject>

          {/* NODE: End */}
          <g transform="translate(60, 625)">
            <rect width="120" height="32" rx="16" fill="#020617" stroke="#10b981" strokeWidth="2" />
            <text x="60" y="21" fill="#34d399" fontSize="12" fontWeight="bold" textAnchor="middle">End</text>
          </g>
        </svg>

        {/* Loopback Status Footer */}
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5 mt-2 py-1 border-t border-slate-800 w-full">
          <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Loop: <span className="text-white font-bold">act() ➔ observe()</span></span>
        </div>
      </div>
    </div>
  );
};
