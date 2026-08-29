import { Department, ScenarioPreset, ApplicantFormData } from '../types';
import { DEPARTMENTS_CATALOG, SCENARIOS as CATALOG_SCENARIOS } from './catalog';

export const DEFAULT_APPLICANT: ApplicantFormData = {
  fullName: '',
  aadhaarNumber: '',
  dob: '',
  gender: '',
  mobile: '',
  email: '',
  address: '',
  uploadedDocumentName: '',
  uploadedDocumentSize: '',
  uploadedDocumentHash: '',
  uploadedDocumentHMAC: '',
  ocrExtractedName: '',
  ocrExtractedDob: '',
  ocrExtractedIdNumber: '',
};

export const DEPARTMENTS: Department[] = DEPARTMENTS_CATALOG;
export const SCENARIOS: ScenarioPreset[] = CATALOG_SCENARIOS;
