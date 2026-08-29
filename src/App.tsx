import React, { useState, useEffect, useRef } from 'react';
import { 
  Department, 
  ServiceWorkflow, 
  WorkflowStep, 
  ApplicantFormData, 
  CivicGuardSignals, 
  AuditEvent, 
  DynamicScenarioType, 
  ContradictionItem,
  SupportedLanguage 
  ,ScenarioDefinition
} from './types';
import { DEPARTMENTS, DEFAULT_APPLICANT } from './data/workflows';
import { tokenizePIIData, computeEventHash } from './utils/crypto';
import { evaluateDynamicSignals, SCENARIOS, resolveScenario } from './utils/dynamicScenario';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { DepartmentCatalog } from './components/DepartmentCatalog';
import { DepartmentDetailView } from './components/DepartmentDetailView';
import { ServiceIntakeView } from './components/ServiceIntakeView';
import { InitializationSequence } from './components/InitializationSequence';
import { ThreeBackground } from './components/ThreeBackground';
import { RuntimeBrowserPanel } from './components/RuntimeBrowserPanel';
import { CivicGuardPanel } from './components/CivicGuardPanel';
import { HITLApprovalModal } from './components/HITLApprovalModal';
import { AuditLedgerView } from './components/AuditLedgerView';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { getTranslation } from './i18n/translations';
import { RuntimeEvent, startRuntimeSession, subscribeToRuntime, respondToApproval } from './runtime/eventClient';
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
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition>(SCENARIOS[0]);
  const [scenarioDefinitions, setScenarioDefinitions] = useState<ScenarioDefinition[]>(SCENARIOS);

  // Execution & Progression State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPausedForHITL, setIsPausedForHITL] = useState<boolean>(false);
  const [isWorkflowCompleted, setIsWorkflowCompleted] = useState<boolean>(false);

  // Backend runtime projection
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[]>([]);
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const unsubscribeRuntime = useRef<(() => void) | null>(null);
  const intakeFormRef = useRef<Record<string, string>>({});

  // Anomaly, Contradiction, & Attack Isolation State
  const [contradiction, setContradiction] = useState<ContradictionItem | null>(null);
  const [isDriftResolved, setIsDriftResolved] = useState<boolean>(false);
  const [isAttackQuarantined, setIsAttackQuarantined] = useState<boolean>(false);

  // Dynamic Signals Consensus Engine
  const [signals, setSignals] = useState<CivicGuardSignals>(() => 
    evaluateDynamicSignals(SCENARIOS[0], 0, false, null, false)
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
        userValue: applicantData.dob || '',
        documentValue: '',
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

  // Start the backend runtime; all subsequent state comes from its event stream.
  const handleStartWorkflow = async () => {
    if (isExecuting) return;
    setViewMode('WORKSPACE');
    setIsWorkflowCompleted(false);
    setIsPausedForHITL(false);
    setIsExecuting(true);
    setCurrentStepIndex(0);
    setRuntimeEvents([]);

    const latestForm = { ...DEFAULT_APPLICANT, ...applicantData, ...intakeFormRef.current };
    const workflowValues: Record<string, string> = {};

    const normalize = (value: string | undefined | null): string =>
      typeof value === 'string' ? value.trim() : '';

    selectedService.fields.forEach((field) => {
      const directValue = normalize(intakeFormRef.current[field.id] ?? (latestForm as Record<string, string | undefined>)[field.id]);
      if (directValue) {
        workflowValues[field.id] = directValue;
      }
    });

    const fullName = normalize(latestForm.fullName);
    const aadhaarNumber = normalize(latestForm.aadhaarNumber);
    const pincode = normalize(latestForm.pincode);
    const address = normalize(latestForm.address);
    const dob = normalize(latestForm.dob);
    const mobile = normalize(latestForm.mobile);

    if (fullName) {
      workflowValues.full_name = workflowValues.full_name || fullName;
      workflowValues.applicant_name = workflowValues.applicant_name || fullName;
      workflowValues.worker_name = workflowValues.worker_name || fullName;
      workflowValues.child_name = workflowValues.child_name || fullName;
    }
    if (aadhaarNumber) {
      workflowValues.aadhaar_number = workflowValues.aadhaar_number || aadhaarNumber;
      workflowValues.license_number = workflowValues.license_number || aadhaarNumber;
    }
    if (mobile) workflowValues.mobile_number = workflowValues.mobile_number || mobile;
    if (pincode) workflowValues.pincode = workflowValues.pincode || pincode;
    if (address) {
      workflowValues.new_address = workflowValues.new_address || address;
      workflowValues.address = workflowValues.address || address;
    }
    if (dob) workflowValues.dob = workflowValues.dob || dob;

    const session = await startRuntimeSession(selectedService.id, workflowValues);
    setRuntimeSessionId(session.session_id);
    unsubscribeRuntime.current?.();
    unsubscribeRuntime.current = subscribeToRuntime(session.session_id, (event) => {
      setRuntimeEvents((previous) => [...previous, event]);
      const stepMatch = event.node_id?.match(/^step_(\d+)_/);
      if (stepMatch) setCurrentStepIndex(Number(stepMatch[1]));
      if (event.type === 'HITL_REQUIRED') {
        setIsPausedForHITL(true);
        setIsExecuting(false);
      }
      if (event.type === 'WORKFLOW_COMPLETED' || event.type === 'WORKFLOW_FAILED') {
        setIsWorkflowCompleted(event.type === 'WORKFLOW_COMPLETED');
        setIsExecuting(false);
      }
    }, () => setIsExecuting(false));
  };

  // Human / Citizen Approval
  const handleApproveHITL = (officerNotes: string) => {
    if (runtimeSessionId) void respondToApproval(runtimeSessionId, true, officerNotes);
    setIsPausedForHITL(false);
    setIsExecuting(true);
  };

  // Rejection
  const handleRejectHITL = () => {
    if (runtimeSessionId) void respondToApproval(runtimeSessionId, false, 'Rejected by user');
    setIsPausedForHITL(false);
    setIsExecuting(false);
  };

  // Resolve Contradiction
  const handleResolveContradiction = () => {
    if (contradiction) {
      setContradiction({ ...contradiction, resolved: true });
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
    unsubscribeRuntime.current?.();
    unsubscribeRuntime.current = null;
    setRuntimeSessionId(null);
    setRuntimeEvents([]);
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
    intakeFormRef.current = { ...formData };
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

  const handleGenerateScenario = async () => {
    const response = await fetch('/api/gemini/generate-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Generate a safe scenario for the current civic workflow', context: { service: selectedService.id, step: currentStepIndex }, requirements: 'Keep sensitive data local and require approval for mutations.' }),
    });
    const payload = await response.json() as { scenario?: ScenarioDefinition };
    if (!payload.scenario) return;
    setScenarioDefinitions((previous) => [...previous.filter((scenario) => scenario.type !== payload.scenario?.type), payload.scenario]);
    setCurrentScenario(payload.scenario.type);
    setActiveScenario(payload.scenario);
    handleReset();
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
          setActiveScenario(resolveScenario(SCENARIOS.find((scenario) => scenario.type === sc)));
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
        scenarios={scenarioDefinitions}
        onGenerateScenario={handleGenerateScenario}
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

            {/* Split Execution Panel: Full Height Rendered Portal & Live LangGraph Node Movement */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (7 cols): Full Rendered Standalone Website Frame (No Inner Scrolling) */}
              <div className="lg:col-span-7 h-full flex flex-col">
                <RuntimeBrowserPanel
                  service={selectedService}
                  events={runtimeEvents}
                  currentStepIndex={currentStepIndex}
                  applicantData={{ ...applicantData, ...intakeFormRef.current }}
                />
              </div>

              {/* Right Column (5 cols): Live LangGraph Engine Nodes & CivicGuard Verification */}
              <div className="lg:col-span-5 h-full flex flex-col space-y-5">
                {/* CivicGuard Consensus Engine */}
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
