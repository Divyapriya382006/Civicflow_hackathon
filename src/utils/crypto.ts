import { AuditEvent, PIIToken, ApplicantFormData } from '../types';

/**
 * Calculates a standard SHA-256 hex string using browser Web Crypto API
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an HMAC-SHA256 signature using a simulated hardware key in KMS
 */
export async function generateHMAC(message: string, secretKey = 'CIVICFLOW_KMS_MASTER_KEY_V2'): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies document HMAC signature against tamper
 */
export async function verifyHMAC(message: string, expectedHmac: string, secretKey = 'CIVICFLOW_KMS_MASTER_KEY_V2'): Promise<boolean> {
  const calculated = await generateHMAC(message, secretKey);
  return calculated === expectedHmac;
}

/**
 * Computes cryptographically linked event hash for tamper-evident ledger
 */
export async function computeEventHash(
  previousHash: string,
  eventData: Omit<AuditEvent, 'eventHash'>
): Promise<string> {
  const payload = JSON.stringify({
    previousHash,
    index: eventData.index,
    timestamp: eventData.timestamp,
    workflowId: eventData.workflowId,
    stepId: eventData.stepId,
    action: eventData.action,
    target: eventData.target,
    agent: eventData.agent,
    riskLevel: eventData.riskLevel,
    confidence: eventData.confidence,
    verificationStatus: eventData.verificationStatus,
    humanApproved: eventData.humanApproved,
  });
  return await sha256(payload);
}

/**
 * Verifies the entire audit trail integrity from genesis block to tip
 */
export async function verifyLedgerIntegrity(ledger: AuditEvent[]): Promise<{
  isValid: boolean;
  tamperedIndex?: number;
  message: string;
}> {
  if (ledger.length === 0) return { isValid: true, message: 'Ledger is empty.' };

  for (let i = 0; i < ledger.length; i++) {
    const current = ledger[i];
    if (i === 0) {
      if (current.previousHash !== '0000000000000000000000000000000000000000000000000000000000000000') {
        return { isValid: false, tamperedIndex: 0, message: 'Genesis block previousHash invalid' };
      }
    } else {
      const prev = ledger[i - 1];
      if (current.previousHash !== prev.eventHash) {
        return {
          isValid: false,
          tamperedIndex: i,
          message: `Hash link broken at event #${i}. Previous hash does not match previous block hash.`,
        };
      }
    }

    const { eventHash, ...eventWithoutHash } = current;
    const recomputed = await computeEventHash(current.previousHash, eventWithoutHash);
    if (recomputed !== eventHash) {
      return {
        isValid: false,
        tamperedIndex: i,
        message: `Cryptographic payload mismatch at event #${i}. Record data has been modified.`,
      };
    }
  }

  return { isValid: true, message: 'All ledger blocks cryptographically verified & tamper-free.' };
}

/**
 * Tokenizes raw sensitive PII data into secure tokens for LLM reasoning
 */
export function tokenizePIIData(raw: ApplicantFormData): {
  tokens: PIIToken[];
  tokenMap: Record<string, string>;
  tokenizedForm: Record<string, string>;
} {
  const tokens: PIIToken[] = [
    {
      rawKey: 'fullName',
      tokenName: 'USER_NAME_42',
      tokenValue: raw.fullName,
      maskedDisplay: raw.fullName.split(' ').map((n, i) => i === 0 ? n : n[0] + '***').join(' '),
      encryptionAlgorithm: 'AES-256-GCM',
      kmsKeyId: 'arn:aws:kms:ap-south-1:civicflow:key/dek-usr-9901',
    },
    {
      rawKey: 'aadhaarNumber',
      tokenName: 'TOKEN_83AF2_AADHAAR',
      tokenValue: raw.aadhaarNumber,
      maskedDisplay: raw.aadhaarNumber.length >= 8 ? `XXXX-XXXX-${raw.aadhaarNumber.slice(-4)}` : 'XXXX-XXXX-3841',
      encryptionAlgorithm: 'AES-256-GCM',
      kmsKeyId: 'arn:aws:kms:ap-south-1:civicflow:key/dek-uid-4421',
    },
    {
      rawKey: 'dob',
      tokenName: 'TOKEN_DOB_SEC99',
      tokenValue: raw.dob,
      maskedDisplay: `**/**/${raw.dob.split('-')[0] || raw.dob.split('/')[2] || '2004'}`,
      encryptionAlgorithm: 'AES-256-GCM',
      kmsKeyId: 'arn:aws:kms:ap-south-1:civicflow:key/dek-dob-1102',
    },
    {
      rawKey: 'mobile',
      tokenName: 'TOKEN_MOB_ENC77',
      tokenValue: raw.mobile,
      maskedDisplay: `+91 ******${raw.mobile.slice(-4)}`,
      encryptionAlgorithm: 'AES-256-GCM',
      kmsKeyId: 'arn:aws:kms:ap-south-1:civicflow:key/dek-tel-5510',
    },
    {
      rawKey: 'address',
      tokenName: 'TOKEN_ADDR_RES54',
      tokenValue: raw.address,
      maskedDisplay: `${raw.address.slice(0, 8)}... [PROTECTED]`,
      encryptionAlgorithm: 'AES-256-GCM',
      kmsKeyId: 'arn:aws:kms:ap-south-1:civicflow:key/dek-geo-8833',
    },
  ];

  const tokenMap: Record<string, string> = {};
  const tokenizedForm: Record<string, string> = {};

  tokens.forEach(t => {
    tokenMap[t.tokenName] = t.tokenValue;
    tokenizedForm[t.rawKey] = t.tokenName;
  });

  return { tokens, tokenMap, tokenizedForm };
}
