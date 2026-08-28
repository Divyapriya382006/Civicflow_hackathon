import { DynamicScenarioType, DynamicScenarioConfig, CivicGuardSignals, ContradictionItem } from '../types';

export const DYNAMIC_SCENARIO_CONFIGS: Record<DynamicScenarioType, DynamicScenarioConfig> = {
  PASS_100: {
    type: 'PASS_100',
    title: '100% PASS',
    tag: 'OPTIMAL RUN',
    description: 'Flawless execution where all 5 verification signals pass with optimal composite confidence.',
    confidenceOverride: 0.992,
    adaptiveBehaviors: {
      requireHITL: false,
      autoRemapDom: false,
      quarantineAdversarialInput: false,
      zeroMutationOnly: false,
    },
  },
  ANOMALY_DETECTED: {
    type: 'ANOMALY_DETECTED',
    title: 'ANOMALY DETECTED',
    tag: 'LAYOUT DRIFT',
    description: 'Official portal updated input selectors or visual layout. Dynamic DOM analyzer identifies and auto-remaps selectors in real-time.',
    confidenceOverride: 0.684,
    simulatedAnomaly: {
      type: 'DOM_DRIFT',
      details: 'Official portal moved target node into an asynchronous shadow container. Dynamic DOM remap resolves target path.',
      triggerStepIndex: 3,
    },
    adaptiveBehaviors: {
      requireHITL: true,
      autoRemapDom: true,
      quarantineAdversarialInput: false,
      zeroMutationOnly: false,
    },
  },
  CONTRADICTION_ALERT: {
    type: 'CONTRADICTION_ALERT',
    title: 'CONTRADICTION ALERT',
    tag: 'MISMATCH FOUND',
    description: 'Cross-document validator detects mismatch between applicant entered field and OCR extracted identity proof.',
    confidenceOverride: 0.742,
    simulatedAnomaly: {
      type: 'DOCUMENT_MISMATCH',
      details: 'Entered Date of Birth differs from official passport extraction.',
      triggerStepIndex: 2,
    },
    adaptiveBehaviors: {
      requireHITL: true,
      autoRemapDom: false,
      quarantineAdversarialInput: false,
      zeroMutationOnly: false,
    },
  },
  ATTACK_QUARANTINED: {
    type: 'ATTACK_QUARANTINED',
    title: 'ATTACK QUARANTINED',
    tag: 'INJECTION BLOCKED',
    description: 'Adversarial DOM injection or script tampering payload intercepted and isolated by security gate before dispatching to local browser.',
    confidenceOverride: 0.315,
    simulatedAnomaly: {
      type: 'INJECTION_ATTACK',
      details: 'Malicious script payload detected in document metadata. Input isolated and quarantined.',
      triggerStepIndex: 1,
    },
    adaptiveBehaviors: {
      requireHITL: true,
      autoRemapDom: false,
      quarantineAdversarialInput: true,
      zeroMutationOnly: false,
    },
  },
  ZERO_MUTATION_AUDIT: {
    type: 'ZERO_MUTATION_AUDIT',
    title: 'ZERO-MUTATION AUDIT',
    tag: 'READ-ONLY INSPECTION',
    description: 'Read-only portal verification where DOM state, records, and certificates are inspected with strict prohibition on form submissions.',
    confidenceOverride: 0.985,
    simulatedAnomaly: {
      type: 'READ_ONLY_AUDIT',
      details: 'Audit mode active: portal data queried and verified without dispatching state-modifying actions.',
      triggerStepIndex: 0,
    },
    adaptiveBehaviors: {
      requireHITL: false,
      autoRemapDom: false,
      quarantineAdversarialInput: false,
      zeroMutationOnly: true,
    },
  },
};

export function evaluateDynamicSignals(
  scenarioType: DynamicScenarioType,
  currentStepIndex: number,
  isDriftResolved: boolean,
  contradiction: ContradictionItem | null,
  isAttackQuarantined: boolean
): CivicGuardSignals {
  switch (scenarioType) {
    case 'PASS_100':
      return {
        domMatch: 0.99,
        pageText: 0.99,
        visualMatch: 0.98,
        workflowState: 1.0,
        actionResult: 0.99,
        compositeConfidence: 0.991,
      };

    case 'ANOMALY_DETECTED':
      if (isDriftResolved) {
        return {
          domMatch: 0.97,
          pageText: 0.98,
          visualMatch: 0.96,
          workflowState: 1.0,
          actionResult: 0.98,
          compositeConfidence: 0.972,
        };
      }
      if (currentStepIndex >= 2) {
        return {
          domMatch: 0.62,
          pageText: 0.68,
          visualMatch: 0.61,
          workflowState: 0.82,
          actionResult: 0.55,
          compositeConfidence: 0.665,
        };
      }
      return {
        domMatch: 0.95,
        pageText: 0.97,
        visualMatch: 0.94,
        workflowState: 0.98,
        actionResult: 0.96,
        compositeConfidence: 0.962,
      };

    case 'CONTRADICTION_ALERT':
      if (contradiction && contradiction.resolved) {
        return {
          domMatch: 0.98,
          pageText: 0.99,
          visualMatch: 0.98,
          workflowState: 1.0,
          actionResult: 0.99,
          compositeConfidence: 0.989,
        };
      }
      return {
        domMatch: 0.96,
        pageText: 0.72,
        visualMatch: 0.66,
        workflowState: 0.85,
        actionResult: 0.74,
        compositeConfidence: 0.792,
      };

    case 'ATTACK_QUARANTINED':
      if (isAttackQuarantined) {
        return {
          domMatch: 0.96,
          pageText: 0.97,
          visualMatch: 0.96,
          workflowState: 1.0,
          actionResult: 0.98,
          compositeConfidence: 0.967,
        };
      }
      return {
        domMatch: 0.88,
        pageText: 0.45,
        visualMatch: 0.40,
        workflowState: 0.50,
        actionResult: 0.30,
        compositeConfidence: 0.512,
      };

    case 'ZERO_MUTATION_AUDIT':
      return {
        domMatch: 0.99,
        pageText: 0.99,
        visualMatch: 0.98,
        workflowState: 1.0,
        actionResult: 0.99,
        compositeConfidence: 0.991,
      };

    default:
      return {
        domMatch: 0.98,
        pageText: 0.99,
        visualMatch: 0.97,
        workflowState: 1.0,
        actionResult: 0.99,
        compositeConfidence: 0.987,
      };
  }
}
