export type DepartmentId = 
  | 'identity' 
  | 'civil_registration' 
  | 'education' 
  | 'transport' 
  | 'revenue_land' 
  | 'municipal' 
  | 'employment' 
  | 'social_welfare' 
  | 'health' 
  | 'agriculture' 
  | 'food_distribution' 
  | 'housing' 
  | 'utilities' 
  | 'financial_benefits' 
  | 'legal_certificates'
  | 'aadhaar';

export type SupportedLanguage = 
  | 'en' // English
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'kn' // Kannada
  | 'bn' // Bengali
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'ml' // Malayalam
  | 'pa' // Punjabi
  | 'or' // Odia
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'ar'; // Arabic

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export type ActionType = 
  | 'NAVIGATE' 
  | 'CLICK' 
  | 'TYPE' 
  | 'SELECT' 
  | 'UPLOAD' 
  | 'SCROLL' 
  | 'WAIT' 
  | 'READ' 
  | 'SCREENSHOT' 
  | 'REVIEW' 
  | 'SUBMIT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  action: ActionType;
  targetSelector: string;
  targetElementLabel: string;
  fieldKey?: string;
  piiTokenKey?: string;
  valueTemplate?: string;
  documentType?: string;
  riskLevel: RiskLevel;
  requiresHITL: boolean;
  expectedDomRole?: string;
  expectedPageUrl?: string;
  expectedStateMatch?: string;
  explanation: {
    intent: string;
    why: string;
    evidence: string[];
    policyRule: string;
  };
}

export type ExtractionHint = 'name' | 'date' | 'number' | 'phone' | 'address' | 'free_text';

export interface ServiceFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'tel' | 'email' | 'textarea' | 'file';
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  voiceHint?: ExtractionHint;
  required: boolean;
  isSensitivePII: boolean;
  piiTokenName?: string;
  helperText?: string;
}

export interface ServiceWorkflow {
  id: string;
  departmentId: DepartmentId;
  title: string;
  subtitle: string;
  category: string;
  officialPortal: string;
  allowedDomains: string[];
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  estimatedMinutes: number;
  requiresHITLApproval: boolean;
  whatItDoes: string;
  whatYouWillNeed: string[];
  requiredDocs: Array<{
    id: string;
    name: string;
    description: string;
    format: string;
    sampleName: string;
  }>;
  fields: ServiceFieldDefinition[];
  steps: WorkflowStep[];
}

export interface Department {
  id: DepartmentId;
  name: string;
  code: string;
  iconName: string;
  badge: string;
  portalUrl: string;
  description: string;
  services: ServiceWorkflow[];
}

export type LangGraphNodeId = 
  | 'intent_validator'
  | 'service_identifier'
  | 'workflow_retriever'
  | 'document_validator'
  | 'step_planner'
  | 'policy_checker'
  | 'dom_analyzer'
  | 'action_generator'
  | 'action_validator'
  | 'security_gate'
  | 'human_approval'
  | 'playwright_executor'
  | 'result_extractor'
  | 'verification_engine'
  | 'confidence_gate';

export type NodeStatus = 'IDLE' | 'ACTIVE' | 'SUCCESS' | 'WARNING' | 'FAILED' | 'WAITING_APPROVAL';

export interface LangGraphNode {
  id: LangGraphNodeId;
  label: string;
  category: 'PLANNING' | 'SECURITY' | 'EXECUTION' | 'VERIFICATION';
  description: string;
  status: NodeStatus;
  lastExecutionTimeMs?: number;
  outputSummary?: string;
}

// Local Laptop Browser Connection & Extracted DOM Representation
export interface DesktopConnectionState {
  isConnected: boolean;
  bridgeEndpoint: string;
  browserType: 'Chrome' | 'Edge' | 'Chromium' | 'Brave';
  debuggingPort: number;
  activeWindowId: string;
  screenResolution: string;
  activeTabUrl: string;
  activeTabTitle: string;
  isInspectingDom: boolean;
  lastPingMs: number;
  totalExtractedNodes: number;
}

export interface ExtractedDomNode {
  id: string;
  tagName: string;
  role: string;
  name: string;
  selector: string;
  value?: string;
  placeholder?: string;
  attributes: Record<string, string>;
  isInteractive: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isTargetedByAgent: boolean;
  isFocused: boolean;
}

export interface NormalizedDOMElement {
  id: string;
  tagName?: string;
  role?: string;
  name?: string;
  label?: string;
  selector?: string;
  value?: string;
  currentValue?: string;
  placeholder?: string;
  element_type?: string;
  required?: boolean;
  visible?: boolean;
  isHighRisk?: boolean;
  dom_path?: string;
  attributes?: Record<string, string>;
  isInteractive?: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CivicGuardSignals {
  domMatch: number;      // 0.30 weight
  pageText: number;      // 0.20 weight
  visualMatch: number;   // 0.20 weight
  workflowState: number; // 0.20 weight
  actionResult: number;  // 0.10 weight
  compositeConfidence: number; // Sum
}

export interface ContradictionItem {
  id: string;
  field: string;
  userValue: string;
  documentValue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  resolved: boolean;
  resolutionAction?: string;
}

export interface AuditEvent {
  id: string;
  index: number;
  timestamp: string;
  workflowId: string;
  stepId: string;
  stepTitle: string;
  action: string;
  target: string;
  agent: string;
  riskLevel: RiskLevel;
  confidence: number;
  verificationStatus: string;
  humanApproved: boolean;
  approverRole?: string;
  notes?: string;
  eventHash: string;
  previousHash: string;
}

export interface CitizenAuditRecord {
  id: string;
  index: number;
  timestamp: string;
  departmentName: string;
  serviceTitle: string;
  stepTitle: string;
  actionTaken: string;
  portalUrl: string;
  verificationStatus: 'VERIFIED' | 'OFFICER_APPROVED' | 'AUTO_CORRECTED' | 'SECURITY_INTERCEPTED';
  officerApproved: boolean;
  approverRole?: string;
  summary: string;
  confirmationToken: string;
}

export interface PIIToken {
  rawKey: string;
  tokenName: string;
  tokenValue: string;
  maskedDisplay: string;
  encryptionAlgorithm?: string;
  kmsKeyId?: string;
}

export interface ApplicantFormData {
  fullName: string;
  aadhaarNumber: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  uploadedDocumentName: string;
  uploadedDocumentSize: string;
  uploadedDocumentHash?: string;
  uploadedDocumentHMAC?: string;
  ocrExtractedName: string;
  ocrExtractedDob: string;
  ocrExtractedIdNumber: string;
  [key: string]: string | undefined;
}

// 5 Dynamic Adaptive Scenario Types
// Scenario IDs are runtime data. Legacy IDs remain valid during migration.
export type DynamicScenarioType = string;

export type ScenarioType = DynamicScenarioType | 'HAPPY_PATH' | 'WORKFLOW_DRIFT' | 'CONTRADICTION_DETECTED';

export interface ScenarioPreset {
  id: string;
  label?: string;
  title?: string;
  tag?: string;
  description: string;
  expectedOutcome?: string;
  injectedAnomaly?: string;
  type?: ScenarioType;
}

export interface DynamicScenarioConfig {
  type: DynamicScenarioType;
  title: string;
  tag: string;
  description: string;
  confidenceOverride?: number;
  simulatedAnomaly?: {
    type: 'DOM_DRIFT' | 'DOCUMENT_MISMATCH' | 'INJECTION_ATTACK' | 'PORTAL_MAINTENANCE' | 'READ_ONLY_AUDIT';
    details: string;
    triggerStepIndex: number;
  };
  adaptiveBehaviors: {
    requireHITL: boolean;
    autoRemapDom: boolean;
    quarantineAdversarialInput: boolean;
    zeroMutationOnly: boolean;
  };
}

export interface ScenarioDefinition extends DynamicScenarioConfig {
  version: number;
  permissions: {
    allowedActions: ActionType[];
    allowMutations: boolean;
    allowSubmission: boolean;
    requireHumanApproval: boolean;
  };
  ui: {
    tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    showBanner: boolean;
    showVault: boolean;
    bannerTitle?: string;
    bannerDescription?: string;
  };
  effects: {
    validateDocuments: boolean;
    inspectDom: boolean;
    quarantineUntrustedContent: boolean;
    confidenceThreshold: number;
  };
}

export type AppStage = 
  | 'LANDING' 
  | 'DEPARTMENT_VIEW' 
  | 'SERVICE_INTAKE' 
  | 'INITIALIZATION' 
  | 'WORKSPACE';
