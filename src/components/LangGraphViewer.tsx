import React, { useState } from 'react';
import { 
  Network, 
  Clock, 
  Cpu, 
  CheckCheck
} from 'lucide-react';
import { LangGraphNodeId, SupportedLanguage } from '../types';
import { getTranslation } from '../i18n/translations';

interface LangGraphViewerProps {
  activeNodeId: LangGraphNodeId | null;
  executedNodeIds: LangGraphNodeId[];
  isPausedForHITL: boolean;
  language: SupportedLanguage;
}

const NODES_CONFIG: Array<{
  id: LangGraphNodeId;
  label: string;
  category: 'PLANNING' | 'SECURITY' | 'EXECUTION' | 'VERIFICATION';
  description: string;
}> = [
  { id: 'intent_validator', label: '1. Intent Validation', category: 'PLANNING', description: 'Parses citizen request & checks semantic scope' },
  { id: 'service_identifier', label: '2. Portal Mapping', category: 'PLANNING', description: 'Maps goal to official department catalog' },
  { id: 'workflow_retriever', label: '3. Workflow Schema', category: 'PLANNING', description: 'Fetches certified government workflow definition' },
  { id: 'document_validator', label: '4. Document Check', category: 'SECURITY', description: 'Validates file format, size, and identity proof integrity' },
  { id: 'step_planner', label: '5. Action Planner', category: 'PLANNING', description: 'Generates structured step sequence & expected DOM states' },
  { id: 'policy_checker', label: '6. Privacy Guard', category: 'SECURITY', description: 'Enforces statutory compliance & PII memory protection' },
  { id: 'dom_analyzer', label: '7. DOM Extraction', category: 'EXECUTION', description: 'Extracts real interactive nodes from local laptop browser' },
  { id: 'action_generator', label: '8. Step Dispatcher', category: 'EXECUTION', description: 'Constrained action synthesis (CLICK/TYPE/UPLOAD/SUBMIT)' },
  { id: 'action_validator', label: '9. Safety Intercept', category: 'SECURITY', description: 'Blocks unauthorized mutations or untrusted redirects' },
  { id: 'security_gate', label: '10. Risk Evaluation', category: 'SECURITY', description: 'Evaluates risk level & determines if confirmation is required' },
  { id: 'human_approval', label: '11. User Sign-Off', category: 'VERIFICATION', description: 'Citizen/Officer authorization modal for high-risk actions' },
  { id: 'playwright_executor', label: '12. Browser Driver', category: 'EXECUTION', description: 'Executes validated action in real laptop browser tab' },
  { id: 'result_extractor', label: '13. DOM Sync', category: 'EXECUTION', description: 'Extracts post-execution state and confirms field values' },
  { id: 'verification_engine', label: '14. Multi-Signal AI', category: 'VERIFICATION', description: 'CivicGuard 5-signal multi-evidence evaluation' },
  { id: 'confidence_gate', label: '15. Consensus Gate', category: 'VERIFICATION', description: 'Proceeds autonomously or triggers safety pause' },
];

export const LangGraphViewer: React.FC<LangGraphViewerProps> = ({
  activeNodeId,
  executedNodeIds,
  isPausedForHITL,
  language,
}) => {
  const [selectedNode, setSelectedNode] = useState<typeof NODES_CONFIG[0] | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PLANNING': return 'border-blue-500/40 text-blue-400 bg-blue-950/30';
      case 'SECURITY': return 'border-purple-500/40 text-purple-400 bg-purple-950/30';
      case 'EXECUTION': return 'border-amber-500/40 text-amber-400 bg-amber-950/30';
      case 'VERIFICATION': return 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30';
      default: return 'border-slate-700 text-slate-400 bg-slate-900';
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide">
            {getTranslation('state_machine_title', language)}
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Deterministic Engine
          </span>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span> Planning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> Security
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Execution
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Verification
          </span>
        </div>
      </div>

      {/* Interactive Graph Node Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {NODES_CONFIG.map((node) => {
          const isActive = activeNodeId === node.id;
          const isExecuted = executedNodeIds.includes(node.id);
          const isHitlWaiting = isPausedForHITL && node.id === 'human_approval';

          let stateClass = 'bg-slate-950/50 border-slate-800 text-slate-400 opacity-70';
          let statusBadge = null;

          if (isHitlWaiting) {
            stateClass = 'bg-amber-950/60 border-amber-500 text-amber-200 ring-2 ring-amber-500/50 animate-pulse';
            statusBadge = <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
          } else if (isActive) {
            stateClass = 'bg-blue-900/60 border-blue-400 text-white ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/20';
            statusBadge = <Cpu className="w-3.5 h-3.5 text-blue-300 animate-bounce" />;
          } else if (isExecuted) {
            stateClass = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300';
            statusBadge = <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />;
          }

          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between hover:border-slate-600 ${stateClass}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {node.category}
                </span>
                {statusBadge}
              </div>
              <p className="text-xs font-semibold leading-tight line-clamp-1">
                {node.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                {node.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between text-xs animate-in fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(selectedNode.category)}`}>
                {selectedNode.category} NODE
              </span>
              <span className="font-semibold text-slate-200">{selectedNode.label}</span>
            </div>
            <p className="text-slate-400">{selectedNode.description}</p>
          </div>
          <button 
            onClick={() => setSelectedNode(null)}
            className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
