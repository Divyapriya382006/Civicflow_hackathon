import { Department, ScenarioPreset, ApplicantFormData } from '../types';
import { DEPARTMENTS_CATALOG, SCENARIOS as CATALOG_SCENARIOS } from './catalog';

export const DEFAULT_APPLICANT: ApplicantFormData = {
  fullName: 'Priya R K',
  aadhaarNumber: '8492-4910-3841',
  dob: '2004-01-01',
  gender: 'Female',
  mobile: '9845012345',
  email: 'divyapriya382006@gmail.com',
  address: 'Plot 42, Green Valley Enclave, Sector 14, Bengaluru, KA - 560001',
  uploadedDocumentName: 'Priya_Identity_Proof_Passport.pdf',
  uploadedDocumentSize: '1.42 MB',
  uploadedDocumentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  uploadedDocumentHMAC: '9a84f33100ab57221d604eefcba2034918e9742a0b12f68434789123fe492109',
  ocrExtractedName: 'Priya R K',
  ocrExtractedDob: '2004-01-01',
  ocrExtractedIdNumber: 'Z8941092',
};

export const DEPARTMENTS: Department[] = DEPARTMENTS_CATALOG;
export const SCENARIOS: ScenarioPreset[] = CATALOG_SCENARIOS;
