import React, { useState, useEffect } from 'react';
import { 
  Department, 
  ServiceWorkflow, 
  WorkflowStep, 
  ApplicantFormData, 
  LangGraphNodeId, 
  CivicGuardSignals, 
  AuditEvent, 
  DynamicScenarioType, 
  ContradictionItem,
  SupportedLanguage 
} from './types';
import { DEPARTMENTS, DEFAULT_APPLICANT } from './data/workflows';
import { tokenizePIIData, computeEventHash } from './utils/crypto';
import { evaluateDynamicSignals, DYNAMIC_SCENARIO_CONFIGS } from './utils/dynamicScenario';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { DepartmentCatalog } from './components/DepartmentCatalog';
import { DepartmentDetailView } from './components/DepartmentDetailView';
import { ServiceIntakeView } from './components/ServiceIntakeView';
import { InitializationSequence } from './components/InitializationSequence';
import { ThreeBackground } from './components/ThreeBackground';
import { LangGraphViewer } from './components/LangGraphViewer';
import { DesktopBrowserController } from './components/DesktopBrowserController';
import { CivicGuardPanel } from './components/CivicGuardPanel';
import { HITLApprovalModal } from './components/HITLApprovalModal';
import { AuditLedgerView } from './components/AuditLedgerView';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { getTranslation } from './i18n/translations';
import { 
  CheckCheck, 
  FileCode2, 
  RotateCcw, 
  ArrowLeft,
  ShieldCheck,
  Search
} from 'lucide-react';

type AppViewMode = 'LANDING' | 'DEPARTMENT_DETAIL' | 'SERVICE_INTAKE' | 'INITIALIZING' | 'WORKSPACE';

export default function App() {
  // Localization State - default to English
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  // Navigation & View Flow State
  const [viewMode, setViewMode] = useState<AppViewMode>('LANDING');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Active Department & Service
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [selectedService, setSelectedService] = useState<ServiceWorkflow>(DEPARTMENTS[0].services[0]);
  const [applicantData, setApplicantData] = useState<ApplicantFormData>(DEFAULT_APPLICANT);

  // Dynamic Scenario State (Generalized Adaptive Scenarios)
  const [currentScenario, setCurrentScenario] = useState<DynamicScenarioType>('PASS_100');

  // Execution & Progression State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPausedForHITL, setIsPausedForHITL] = useState<boolean>(false);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState<boolean>(false);

  // LangGraph State Machine
  const [activeNodeId, setActiveNodeId] = useState<LangGraphNodeId | null>(null);
  const [executedNodeIds, setExecutedNodeIds] = useState<LangGraphNodeId[]>([]);

  // Anomaly, Contradiction, & Attack Isolation State
  const [contradiction, setContradiction] = useState<ContradictionItem | null>(null);
  const [isDriftResolved, setIsDriftResolved] = useState<boolean>(false);
  const [isAttackQuarantined, setIsAttackQuarantined] = useState<boolean>(false);

  // Dynamic Signals Consensus Engine
  const [signals, setSignals] = useState<CivicGuardSignals>(() => 
    evaluateDynamicSignals('PASS_100', 0, false, null, false)
  );

  // Tamper-Evident Audit Ledger State
  const [auditLedger, setAuditLedger] = useState<AuditEvent[]>([]);
  const [latestHash, setLatestHash] = useState<string>('0000000000000000000000000000000000000000000000000000000000000000');

  // Modals
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);

  // PII Tokens
  const { tokens } = tokenizePIIData(applicantData);
  const steps = selectedService.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  // Initialize genesis audit block
  useEffect(() => {
    async function initLedger() {
      if (auditLedger.length === 0) {
        const genesisData: Omit<AuditEvent, 'eventHash'> = {
          id: 'AUD-000',
          index: 0,
          timestamp: new Date().toISOString(),
          workflowId: selectedService.id,
          stepId: 'S0_INIT',
          stepTitle: 'CivicFlow Local Session Initialized',
          action: 'NAVIGATE',
          target: selectedService.officialPortal,
          agent: 'civicflow-browser-bridge',
          riskLevel: 'LOW',
          confidence: 1.0,
          verificationStatus: 'PASS',
          humanApproved: false,
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        };
        const genesisHash = await computeEventHash(genesisData.previousHash, genesisData);
        const genesisEvent: AuditEvent = { ...genesisData, eventHash: genesisHash };
        setAuditLedger([genesisEvent]);
        setLatestHash(genesisHash);
      }
    }
    initLedger();
  }, [selectedService.id, selectedService.officialPortal, auditLedger.length]);

  // Update dynamic scenario state & signals whenever scenario or step changes
  useEffect(() => {
    if (currentScenario === 'CONTRADICTION_ALERT' && (!contradiction || !contradiction.resolved)) {
      setContradiction({
        id: 'CONT-DOB-01',
        field: 'Date of Birth',
        userValue: '2004-01-01',
        documentValue: '2003-01-01',
        severity: 'HIGH',
        reason: 'Entered Date of Birth differs from official document OCR scan.',
        resolved: false,
      });
    }

    const evaluated = evaluateDynamicSignals(
      currentScenario,
      currentStepIndex,
      isDriftResolved,
      contradiction,
      isAttackQuarantined
    );
    setSignals(evaluated);
  }, [currentScenario, currentStepIndex, isDriftResolved, contradiction, isAttackQuarantined]);

  // Record an action event into the audit ledger
  const recordAuditEvent = async (step: WorkflowStep, approvedByHuman = false, notes?: string) => {
    const nextIndex = auditLedger.length;
    const eventPayload: Omit<AuditEvent, 'eventHash'> = {
      id: `AUD-${String(nextIndex).padStart(3, '0')}`,
      index: nextIndex,
      timestamp: new Date().toISOString(),
      workflowId: selectedService.id,
      stepId: step.id,
      stepTitle: step.title,
      action: step.action,
      target: step.targetElementLabel,
      agent: 'local-browser-playwright-driver',
      riskLevel: step.riskLevel,
      confidence: signals.compositeConfidence,
      verificationStatus: approvedByHuman ? 'REVIEW_APPROVED' : 'PASS',
      humanApproved: approvedByHuman,
      approverRole: approvedByHuman ? 'Human Officer / Citizen Sign-off' : undefined,
      notes: notes || step.explanation.why,
      previousHash: latestHash,
    };

    const newHash = await computeEventHash(latestHash, eventPayload);
    const completedEvent: AuditEvent = { ...eventPayload, eventHash: newHash };

    setAuditLedger((prev) => [...prev, completedEvent]);
    setLatestHash(newHash);
  };

  // LangGraph Step Execution Runner
  const runLangGraphStep = async (stepIdx: number) => {
    const targetStep = steps[stepIdx];
    if (!targetStep) return;

    const nodeSequence: LangGraphNodeId[] = [
      'intent_validator',
      'service_identifier',
      'workflow_retriever',
      'document_validator',
      'step_planner',
      'policy_checker',
      'dom_analyzer',
      'action_generator',
      'action_validator',
      'security_gate',
    ];

    for (const nodeId of nodeSequence) {
      setActiveNodeId(nodeId);
      setExecutedNodeIds((prev) => Array.from(new Set([...prev, nodeId])));
      await new Promise((r) => setTimeout(r, 90));
    }

    // HITL Pause if required by scenario, step, or low confidence
    const scenarioConfig = DYNAMIC_SCENARIO_CONFIGS[currentScenario];
    const isZeroMutation = scenarioConfig.adaptiveBehaviors.zeroMutationOnly;

    if (isZeroMutation && targetStep.action === 'SUBMIT') {
      // In zero-mutation mode, don't execute mutations
      setActiveNodeId('verification_engine');
      setIsWorkflowCompleted(true);
      setIsExecuting(false);
      return;
    }

    if (
      targetStep.requiresHITL || 
      signals.compositeConfidence < 0.90 || 
      targetStep.action === 'SUBMIT' ||
      (currentScenario === 'ANOMALY_DETECTED' && !isDriftResolved && stepIdx >= 2) ||
      (currentScenario === 'CONTRADICTION_ALERT' && contradiction && !contradiction.resolved && stepIdx >= 1)
    ) {
      setActiveNodeId('human_approval');
      setIsPausedForHITL(true);
      setIsExecuting(false);
      return;
    }

    await completeStepExecution(stepIdx, false);
  };

  // Complete step execution
  const completeStepExecution = async (stepIdx: number, approvedByHuman: boolean, officerNotes?: string) => {
    const targetStep = steps[stepIdx];
    const postExecutionNodes: LangGraphNodeId[] = [
      'playwright_executor',
      'result_extractor',
      'verification_engine',
      'confidence_gate',
    ];

    for (const nodeId of postExecutionNodes) {
      setActiveNodeId(nodeId);
      setExecutedNodeIds((prev) => Array.from(new Set([...prev, nodeId])));
      await new Promise((r) => setTimeout(r, 100));
    }

    await recordAuditEvent(targetStep, approvedByHuman, officerNotes);

    if (stepIdx < steps.length - 1) {
      setCurrentStepIndex(stepIdx + 1);
      setIsExecuting(true);
      setTimeout(() => {
        runLangGraphStep(stepIdx + 1);
      }, 300);
    } else {
      setIsWorkflowCompleted(true);
      setIsExecuting(false);
      setActiveNodeId(null);
    }
  };

  // Start execution after initialization
  const handleStartWorkflow = () => {
    setViewMode('WORKSPACE');
    setIsWorkflowCompleted(false);
    setIsPausedForHITL(false);
    setIsExecuting(true);
    setCurrentStepIndex(0);
    setExecutedNodeIds([]);
    runLangGraphStep(0);
  };

  // Human / Citizen Approval
  const handleApproveHITL = (officerNotes: string) => {
    setIsPausedForHITL(false);
    completeStepExecution(currentStepIndex, true, officerNotes);
  };

  // Rejection
  const handleRejectHITL = () => {
    setIsPausedForHITL(false);
    setIsExecuting(false);
    setActiveNodeId(null);
  };

  // Resolve Contradiction
  const handleResolveContradiction = () => {
    if (contradiction) {
      setContradiction({ ...contradiction, resolved: true });
      setApplicantData({ ...applicantData, dob: '2004-01-01', ocrExtractedDob: '2004-01-01' });
      setSignals({
        domMatch: 0.98,
        pageText: 0.99,
        visualMatch: 0.98,
        workflowState: 1.0,
        actionResult: 0.99,
        compositeConfidence: 0.988,
      });
    }
  };

  // Resolve Anomaly Drift
  const handleRemapDrift = () => {
    setIsDriftResolved(true);
    setSignals({
      domMatch: 0.97,
      pageText: 0.98,
      visualMatch: 0.96,
      workflowState: 1.0,
      actionResult: 0.98,
      compositeConfidence: 0.972,
    });
  };

  // Quarantine Attack Handler
  const handleQuarantineAttack = () => {
    setIsAttackQuarantined(true);
    setSignals({
      domMatch: 0.96,
      pageText: 0.97,
      visualMatch: 0.96,
      workflowState: 1.0,
      actionResult: 0.98,
      compositeConfidence: 0.967,
    });
  };

  // Reset Session
  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsExecuting(false);
    setIsPausedForHITL(false);
    setIsWorkflowCompleted(false);
    setActiveNodeId(null);
    setExecutedNodeIds([]);
    setIsDriftResolved(false);
    setContradiction(null);
    setIsAttackQuarantined(false);
  };

  // Return to Catalog
  const handleReturnToCatalog = () => {
    handleReset();
    setViewMode('LANDING');
    setCatalogSearchQuery('');
  };

  // Quick Service Selection
  const handleQuickSelectService = (serviceId: string) => {
    for (const dept of DEPARTMENTS) {
      const foundService = dept.services.find((s) => s.id === serviceId);
      if (foundService) {
        setSelectedDepartment(dept);
        setSelectedService(foundService);
        setViewMode('SERVICE_INTAKE');
        return;
      }
    }
  };

  // Service intake form submission
  const handleIntakeSubmit = (formData: Record<string, string>, docData: { name: string; size: string; hash: string; hmac: string }) => {
    setApplicantData((prev) => ({
      ...prev,
      ...formData,
      uploadedDocumentName: docData.name,
      uploadedDocumentSize: docData.size,
      uploadedDocumentHash: docData.hash,
      uploadedDocumentHMAC: docData.hmac,
    }));
    setViewMode('INITIALIZING');
  };

  const totalServicesCount = DEPARTMENTS.reduce((acc, d) => acc + d.services.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* 3D Holographic Particle Canvas */}
      <ThreeBackground />

      {/* Top Header with Language Dropdown & Adaptive Dynamic Scenarios */}
      <Header
        currentScenario={currentScenario}
        onSelectScenario={(sc) => {
          setCurrentScenario(sc);
          handleReset();
        }}
        language={language}
        onSelectLanguage={setLanguage}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenLedger={() => setIsLedgerOpen(true)}
        onReset={handleReset}
        onReturnToCatalog={handleReturnToCatalog}
        isRunning={isExecuting}
        totalAuditCount={auditLedger.length}
        isInWorkspace={viewMode === 'WORKSPACE'}
      />

      {/* View Router */}
      <main className="flex-1 w-full relative z-10">
        {/* STAGE 1: Citizen Landing & Department Catalog */}
        {viewMode === 'LANDING' && (
          <div className="space-y-8 pb-16">
            <LandingHero
              searchQuery={catalogSearchQuery}
              onSearchChange={setCatalogSearchQuery}
              onSelectQuickService={handleQuickSelectService}
              totalDepartments={DEPARTMENTS.length}
              totalServices={totalServicesCount}
              language={language}
              onSelectLanguage={setLanguage}
            />
            <DepartmentCatalog
              departments={DEPARTMENTS}
              searchQuery={catalogSearchQuery}
              onSelectDepartment={(dept) => {
                setSelectedDepartment(dept);
                setViewMode('DEPARTMENT_DETAIL');
              }}
              language={language}
            />
          </div>
        )}

        {/* STAGE 2: Department Detail View */}
        {viewMode === 'DEPARTMENT_DETAIL' && (
          <DepartmentDetailView
            department={selectedDepartment}
            onBack={() => setViewMode('LANDING')}
            onSelectService={(service) => {
              setSelectedService(service);
              setViewMode('SERVICE_INTAKE');
            }}
            language={language}
          />
        )}

        {/* STAGE 3: Service Intake Preparation */}
        {viewMode === 'SERVICE_INTAKE' && (
          <ServiceIntakeView
            department={selectedDepartment}
            service={selectedService}
            onBack={() => setViewMode('DEPARTMENT_DETAIL')}
            onStartApplication={handleIntakeSubmit}
            language={language}
          />
        )}

        {/* STAGE 4: Guided Initialization Animation */}
        {viewMode === 'INITIALIZING' && (
          <InitializationSequence
            service={selectedService}
            onComplete={handleStartWorkflow}
            language={language}
          />
        )}

        {/* STAGE 5: Live Execution Workspace */}
        {viewMode === 'WORKSPACE' && (
          <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReturnToCatalog}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Return to Catalog"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {selectedService.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedDepartment.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Official Portal: {selectedService.officialPortal}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => setIsVaultOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{getTranslation('nav_privacy_vault', language)}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{getTranslation('nav_restart', language)}</span>
                </button>
              </div>
            </div>

            {/* LangGraph Deterministic Engine Visualizer */}
            <LangGraphViewer
              activeNodeId={activeNodeId}
              executedNodeIds={executedNodeIds}
              isPausedForHITL={isPausedForHITL}
              language={language}
            />

            {/* Workflow Completed Summary Hero */}
            {isWorkflowCompleted && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30">
                      <CheckCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">
                          Government Application Executed & Verified
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
                          VERIFIED DOCKET
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {steps.length}/{steps.length} Steps Executed • Dispatched to Local Browser • Memory Cleared
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                      onClick={() => setIsLedgerOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      <FileCode2 className="w-4 h-4" />
                      <span>{getTranslation('nav_ledger', language)}</span>
                    </button>
                    <button
                      onClick={handleReturnToCatalog}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{getTranslation('back_to_catalog', language)}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Split Execution Panel: Local Desktop Browser Controller & CivicGuard Consensus Meter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (7 cols): Desktop Browser Controller (Real Laptop Browser Integration) */}
              <div className="lg:col-span-7 h-full flex flex-col">
                <DesktopBrowserController
                  department={selectedDepartment}
                  service={selectedService}
                  currentStepIndex={currentStepIndex}
                  steps={steps}
                  applicantData={applicantData}
                  currentScenario={currentScenario}
                  isExecuting={isExecuting}
                  language={language}
                />
              </div>

              {/* Right Column (5 cols): CivicGuard Verification Engine */}
              <div className="lg:col-span-5 h-full flex flex-col">
                <CivicGuardPanel
                  signals={signals}
                  currentStep={currentStep}
                  currentStepIndex={currentStepIndex}
                  totalSteps={steps.length}
                  contradiction={contradiction}
                  onResolveContradiction={handleResolveContradiction}
                  onRemapDrift={handleRemapDrift}
                  onQuarantineAttack={handleQuarantineAttack}
                  currentScenario={currentScenario}
                  isExecuting={isExecuting}
                  language={language}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Human-in-the-loop (HITL) Execution Control Modal */}
      <HITLApprovalModal
        isOpen={isPausedForHITL}
        step={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        applicantData={applicantData}
        compositeConfidence={signals.compositeConfidence}
        onApprove={handleApproveHITL}
        onReject={handleRejectHITL}
        language={language}
      />

      {/* Tamper-Evident Immutable Audit Ledger Modal */}
      <AuditLedgerView
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        ledger={auditLedger}
        language={language}
      />

      {/* PII Tokenizer & Security Vault Modal */}
      <SecurityVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        tokens={tokens}
        applicantData={applicantData}
        language={language}
      />
    </div>
  );
}
