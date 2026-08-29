import { Department, ScenarioPreset } from '../types';

export const DEPARTMENTS_CATALOG: Department[] = [
  {
    id: 'identity',
    name: 'Identity & Citizen Documents',
    code: 'UIDAI-E-GOV',
    iconName: 'Fingerprint',
    badge: 'Apex Identity',
    portalUrl: '/portals/site3_aadhaar.html',
    description: 'National biometric identity management, Aadhaar address updates, DigiLocker credentials, and passport applications.',
    services: [
      {
        id: 'uidai_address_update',
        departmentId: 'identity',
        title: 'Aadhaar Address Update (SSUP)',
        subtitle: 'Official Self-Service Update Portal (SSUP) Address Modification with Proof of Address Verification',
        category: 'Demographic Update',
        officialPortal: '/portals/site3_aadhaar.html#/aadhaar-address-update',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Updates your legal residential address in the UIDAI database with proof of address document verification.',
        whatYouWillNeed: [
          '12-digit Aadhaar Number',
          'New residential address and 6-digit Pincode',
          'Valid proof of address document (Passport, Voter ID, Ration Card, Bill)',
          'Uploaded document file'
        ],
        requiredDocs: [
          { id: 'poa_proof', name: 'Proof of Address Document', description: 'Certified government ID or utility bill', format: 'PDF / JPEG', sampleName: 'Address_Proof_Document.pdf' }
        ],
        fields: [
          { id: 'aadhaar_number', label: '12-Digit Aadhaar Number', type: 'text', placeholder: '849249103841', defaultValue: '849249103841', required: true, isSensitivePII: true, piiTokenName: 'AADHAAR_TOKEN_94' },
          { id: 'new_address', label: 'New Residential Address', type: 'text', placeholder: 'Plot 42, Green Valley Enclave, Sector 14', defaultValue: 'Plot 42, Green Valley Enclave, Sector 14', required: true, isSensitivePII: true, piiTokenName: 'ADDRESS_TOKEN_71' },
          { id: 'pincode', label: 'Pincode', type: 'text', placeholder: '560001', defaultValue: '560001', required: true, isSensitivePII: false },
          { id: 'doc_type', label: 'Proof Document Type', type: 'select', options: ['Passport', 'Voter ID', 'Ration Card', 'Electricity Bill'], defaultValue: 'Passport', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to UIDAI SSUP Portal', description: 'Open official Aadhaar address update portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site3_aadhaar.html#/aadhaar-address-update', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site3_aadhaar.html#/aadhaar-address-update',
            explanation: { intent: 'Access SSUP portal', why: 'Directs Playwright agent to Aadhaar fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Enter Aadhaar Number & Address', description: 'Fill 12-digit Aadhaar number, new address, and pincode.', action: 'TYPE',
            targetSelector: '[data-testid="aadhaar-number-input"]', targetElementLabel: 'Aadhaar Number Input', fieldKey: 'aadhaar_number', piiTokenKey: 'AADHAAR_TOKEN_94', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate address update fields', why: 'Fills target fields via stable testids.', evidence: ['Input data-testid matched'], policyRule: 'PII-POL-02: Local tokenization.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Select Document Type & Upload Proof', description: 'Choose document proof type and upload verified address proof PDF.', action: 'UPLOAD',
            targetSelector: '[data-testid="aadhaar-doc-upload"]', targetElementLabel: 'Upload Document File', documentType: 'Address_Proof.pdf', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'file',
            explanation: { intent: 'Attach proof of address', why: 'Mandatory verification against statutory update guidelines.', evidence: ['Doc uploaded'], policyRule: 'DOC-POL-01: Valid proof required.' }
          },
          {
            id: 'S4', stepNumber: 4, title: 'Submit Address Update Request', description: 'Commit update request and receive Update Request Number (URN).', action: 'SUBMIT',
            targetSelector: '[data-testid="aadhaar-submit-btn"]', targetElementLabel: 'Submit Update Request Button', riskLevel: 'CRITICAL', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch update transaction', why: 'High-risk transaction requires explicit officer signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human approval mandatory.' }
          }
        ]
      },
      {
        id: 'digilocker_document_retrieval',
        departmentId: 'identity',
        title: 'DigiLocker Document Retrieval',
        subtitle: 'National Digital Document Repository — Instant Official Record Retrieval',
        category: 'Digital Locker',
        officialPortal: '/portals/site4_digilocker_passport.html#/digilocker',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'SIMPLE',
        estimatedMinutes: 2,
        requiresHITLApproval: false,
        whatItDoes: 'Retrieves digitally signed government records (Aadhaar, PAN, DL, Marksheet) directly from authorized issuers.',
        whatYouWillNeed: [
          '12-digit Aadhaar / DigiLocker ID',
          'Document Type and Issuing Authority'
        ],
        requiredDocs: [],
        fields: [
          { id: 'aadhaar_id', label: 'Aadhaar / DigiLocker ID', type: 'text', placeholder: '849249103841', defaultValue: '849249103841', required: true, isSensitivePII: true, piiTokenName: 'AADHAAR_TOKEN_94' },
          { id: 'doc_type', label: 'Document Type', type: 'select', options: ['Aadhaar Card', 'PAN Card Verification Record', 'Driving License', 'Class XII Marksheet'], defaultValue: 'Aadhaar Card', required: true, isSensitivePII: false },
          { id: 'authority', label: 'Issuing Authority', type: 'select', options: ['UIDAI', 'Income Tax Department', 'Ministry of Road Transport', 'CBSE'], defaultValue: 'UIDAI', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to DigiLocker Portal', description: 'Open DigiLocker document retrieval service.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site4_digilocker_passport.html#/digilocker', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site4_digilocker_passport.html#/digilocker',
            explanation: { intent: 'Access DigiLocker gateway', why: 'Directs Playwright agent to target test fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Select Document & Authority', description: 'Input DigiLocker ID, select document type and authority.', action: 'SELECT',
            targetSelector: '[data-testid="digilocker-doctype-select"]', targetElementLabel: 'Document Type Select', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'combobox',
            explanation: { intent: 'Specify document parameters', why: 'Populates document query fields.', evidence: ['Option selected'], policyRule: 'WORKFLOW-01: Parameters selected.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Fetch DigiLocker Document', description: 'Execute document retrieval query.', action: 'SUBMIT',
            targetSelector: '[data-testid="digilocker-submit-btn"]', targetElementLabel: 'Fetch Document Button', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'button',
            explanation: { intent: 'Retrieve verified document token', why: 'Fetches digital signed record from DigiLocker repository.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'VERIF-POL-01: Retrieval confirmed.' }
          }
        ]
      },
      {
        id: 'passport_application',
        departmentId: 'identity',
        title: 'Passport Seva Application',
        subtitle: 'Ministry of External Affairs Passport Issuance & Re-issue Gateway',
        category: 'Travel Documents',
        officialPortal: '/portals/site4_digilocker_passport.html#/passport',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'COMPLEX',
        estimatedMinutes: 4,
        requiresHITLApproval: true,
        whatItDoes: 'Registers application for Fresh or Re-issue of Indian Passport with ARN generation.',
        whatYouWillNeed: [
          'Full legal name and date of birth',
          'Application Type & Booklet choice (36 / 60 pages)',
          'Permanent address details'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '2004-01-01', required: true, isSensitivePII: true, piiTokenName: 'DOB_TOKEN_12' },
          { id: 'passport_type', label: 'Application Type', type: 'select', options: ['Fresh Passport', 'Re-issue Passport'], defaultValue: 'Fresh Passport', required: true, isSensitivePII: false },
          { id: 'booklet', label: 'Booklet Type', type: 'select', options: ['36 Pages', '60 Pages'], defaultValue: '36 Pages', required: true, isSensitivePII: false },
          { id: 'address', label: 'Permanent Address', type: 'text', placeholder: 'Plot 42, Green Valley Enclave, Bengaluru', defaultValue: 'Plot 42, Green Valley Enclave, Bengaluru', required: true, isSensitivePII: true, piiTokenName: 'ADDRESS_TOKEN_71' }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Passport Seva Portal', description: 'Open Passport Seva online application portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site4_digilocker_passport.html#/passport', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site4_digilocker_passport.html#/passport',
            explanation: { intent: 'Access Passport portal', why: 'Directs Playwright agent to target test fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Personal & Application Type Details', description: 'Enter full name, DOB, application type, booklet, and address.', action: 'TYPE',
            targetSelector: '[data-testid="passport-fullname-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate passport applicant dossier', why: 'Fills required form inputs via testids.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Form completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Passport Application', description: 'Submit application and generate Application Reference Number (ARN).', action: 'SUBMIT',
            targetSelector: '[data-testid="passport-submit-btn"]', targetElementLabel: 'Submit Passport Button', riskLevel: 'CRITICAL', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Commit passport application', why: 'High-risk government filing requires human officer approval.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human approval mandatory.' }
          }
        ]
      }
    ]
  },
  {
    id: 'civil_registration',
    name: 'Civil Registration & Vital Records',
    code: 'CRS-NIC-VITAL',
    iconName: 'FileCheck',
    badge: 'Vital Registry',
    portalUrl: '/portals/site5_parivahan_vital.html#/birth',
    description: 'Vital statistics, birth certificates, death certificates, and marriage registrations with registrar sign-off.',
    services: [
      {
        id: 'birth_certificate',
        departmentId: 'civil_registration',
        title: 'Birth Certificate Registration',
        subtitle: 'Civil Registration System (CRS) Birth Registration & Nativity Certificate Issuance',
        category: 'Birth Registration',
        officialPortal: '/portals/site5_parivahan_vital.html#/birth',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Submits formal registration request for digital birth certificate issuance.',
        whatYouWillNeed: [
          'Child legal full name and date of birth',
          'Mother and Father full names',
          'Hospital / Place of birth details'
        ],
        requiredDocs: [],
        fields: [
          { id: 'child_name', label: 'Child Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '2004-01-01', required: true, isSensitivePII: true, piiTokenName: 'DOB_TOKEN_12' },
          { id: 'mother_name', label: 'Mother Full Name', type: 'text', placeholder: 'Radha K', defaultValue: 'Radha K', required: true, isSensitivePII: true, piiTokenName: 'MOTHER_NAME_03' },
          { id: 'father_name', label: 'Father Full Name', type: 'text', placeholder: 'Krishnan R', defaultValue: 'Krishnan R', required: true, isSensitivePII: true, piiTokenName: 'FATHER_NAME_04' },
          { id: 'hospital', label: 'Hospital / Place of Birth', type: 'text', placeholder: 'St. Martha Maternity Hospital, Bengaluru', defaultValue: 'St. Martha Maternity Hospital, Bengaluru', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Birth Certificate Portal', description: 'Open CRS birth certificate registration gateway.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site5_parivahan_vital.html#/birth', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site5_parivahan_vital.html#/birth',
            explanation: { intent: 'Access birth registration gateway', why: 'Directs agent to vital registration fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Demographics & Parent Details', description: 'Enter child name, DOB, parents names, and hospital location.', action: 'TYPE',
            targetSelector: '[data-testid="birth-childname-input"]', targetElementLabel: 'Child Name Input', fieldKey: 'child_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate vital registration record', why: 'Inputs demographic details via testid selectors.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Field completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Birth Registration', description: 'Commit birth registration request to registrar desk.', action: 'SUBMIT',
            targetSelector: '[data-testid="birth-submit-btn"]', targetElementLabel: 'Submit Birth Registration Button', riskLevel: 'CRITICAL', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch vital registration docket', why: 'Statutory birth registration mandates registrar signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human approval required.' }
          }
        ]
      },
      {
        id: 'death_certificate',
        departmentId: 'civil_registration',
        title: 'Death Certificate Registration',
        subtitle: 'Civil Registration System (CRS) Death Record Registration',
        category: 'Death Registration',
        officialPortal: '/portals/site5_parivahan_vital.html#/death',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Processes death registration application for certified civil record issuance.',
        whatYouWillNeed: [
          'Deceased person full name and date of death',
          'Informant / Applicant full name',
          'Place of death details'
        ],
        requiredDocs: [],
        fields: [
          { id: 'deceased_name', label: 'Deceased Full Name', type: 'text', placeholder: 'Late Krishnan R', defaultValue: 'Late Krishnan R', required: true, isSensitivePII: true, piiTokenName: 'DECEASED_NAME_08' },
          { id: 'dod', label: 'Date of Death', type: 'date', defaultValue: '2026-01-15', required: true, isSensitivePII: false },
          { id: 'applicant_name', label: 'Informant Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'place_of_death', label: 'Place of Death', type: 'text', placeholder: 'Bengaluru East Hospital', defaultValue: 'Bengaluru East Hospital', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Death Certificate Portal', description: 'Open CRS death registration gateway.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site5_parivahan_vital.html#/death', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site5_parivahan_vital.html#/death',
            explanation: { intent: 'Access death registration gateway', why: 'Directs agent to vital registration fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Deceased & Informant Details', description: 'Enter deceased name, DOD, informant name, and place of death.', action: 'TYPE',
            targetSelector: '[data-testid="death-deceasedname-input"]', targetElementLabel: 'Deceased Name Input', fieldKey: 'deceased_name', piiTokenKey: 'DECEASED_NAME_08', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate death record dossier', why: 'Inputs details via testid selectors.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Field completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Death Registration Request', description: 'Submit record to registrar.', action: 'SUBMIT',
            targetSelector: '[data-testid="death-submit-btn"]', targetElementLabel: 'Submit Death Button', riskLevel: 'CRITICAL', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch death record docket', why: 'Statutory death record mandates registrar signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human signoff mandatory.' }
          }
        ]
      }
    ]
  },
  {
    id: 'transport',
    name: 'Parivahan Sewa',
    code: 'MORTH-PARIVAHAN-GOV',
    iconName: 'Car',
    badge: 'Parivahan Sewa',
    portalUrl: '/portals/site5_parivahan_vital.html#/parivahan',
    description: 'Learner licence, driving licence renewal, vehicle registration certificate (RC), and international driving permits.',
    services: [
      {
        id: 'parivahan_service',
        departmentId: 'transport',
        title: 'Parivahan Driving Licence Renewal',
        subtitle: 'Ministry of Road Transport & Highways Online DL Services',
        category: 'Licensing',
        officialPortal: '/portals/site5_parivahan_vital.html#/parivahan',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Processes driving licence renewal and endorsement applications with state RTO jurisdiction routing.',
        whatYouWillNeed: [
          'Driving Licence Number and Date of Birth',
          'State Jurisdiction and RTO Office selection'
        ],
        requiredDocs: [],
        fields: [
          { id: 'dl_number', label: 'Driving Licence Number', type: 'text', placeholder: 'KA-0120200049102', defaultValue: 'KA-0120200049102', required: true, isSensitivePII: true, piiTokenName: 'DL_TOKEN_99' },
          { id: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '2004-01-01', required: true, isSensitivePII: true, piiTokenName: 'DOB_TOKEN_12' },
          { id: 'state', label: 'State Jurisdiction', type: 'select', options: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Delhi'], defaultValue: 'Karnataka', required: true, isSensitivePII: false },
          { id: 'rto_office', label: 'RTO Office', type: 'select', options: ['KA-01 Bengaluru Central', 'MH-01 Mumbai South', 'TN-01 Chennai Central', 'DL-01 Delhi Central'], defaultValue: 'KA-01 Bengaluru Central', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Parivahan DL Portal', description: 'Open Parivahan driving licence services portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site5_parivahan_vital.html#/parivahan', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site5_parivahan_vital.html#/parivahan',
            explanation: { intent: 'Access Parivahan DL portal', why: 'Directs Playwright agent to transport fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Enter Licence Number & RTO Office', description: 'Input DL number, DOB, select state and RTO office.', action: 'TYPE',
            targetSelector: '[data-testid="parivahan-dlno-input"]', targetElementLabel: 'DL Number Input', fieldKey: 'dl_number', piiTokenKey: 'DL_TOKEN_99', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate DL renewal record', why: 'Fills fields using target testid selectors.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Parameters selected.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit DL Renewal Application', description: 'Submit renewal request to RTO authority.', action: 'SUBMIT',
            targetSelector: '[data-testid="parivahan-submit-btn"]', targetElementLabel: 'Submit Renewal Button', riskLevel: 'HIGH', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch DL renewal request', why: 'High-risk licensing action mandates human signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Officer approval mandatory.' }
          }
        ]
      }
    ]
  },
  {
    id: 'revenue_land',
    name: 'Land Registry',
    code: 'REV-LAND-RECORDS',
    iconName: 'Landmark',
    badge: 'Land Registry',
    portalUrl: '/portals/site6_revenue_certificates.html#/income',
    description: 'Digital land records (RTC / Bhoomi), Mutation Extract, Caste & Income Certificates, and Residence status validation.',
    services: [
      {
        id: 'income_certificate',
        departmentId: 'revenue_land',
        title: 'Income Certificate Application',
        subtitle: 'Revenue Department Annual Family Income Status Certificate',
        category: 'Revenue Certificates',
        officialPortal: '/portals/site6_revenue_certificates.html#/income',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Submits application for statutory annual family income certificate issuance.',
        whatYouWillNeed: [
          'Applicant Full Name & Annual Family Income amount',
          'Purpose of Certificate selection'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'annual_income', label: 'Annual Family Income (₹)', type: 'text', placeholder: '120000', defaultValue: '120000', required: true, isSensitivePII: false },
          { id: 'purpose', label: 'Purpose of Certificate', type: 'select', options: ['Education Scholarship', 'Fee Concession', 'Government Housing Scheme', 'Social Welfare Scheme'], defaultValue: 'Education Scholarship', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Income Certificate Portal', description: 'Open Revenue Department Income Certificate portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site6_revenue_certificates.html#/income', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site6_revenue_certificates.html#/income',
            explanation: { intent: 'Access Income Certificate gateway', why: 'Directs Playwright agent to revenue fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Applicant Name & Income Details', description: 'Enter full name, annual income amount, and select purpose.', action: 'TYPE',
            targetSelector: '[data-testid="income-fullname-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate income certificate dossier', why: 'Fills form inputs via testids.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Field completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Income Certificate Request', description: 'Submit application to Tahsildar / Revenue officer.', action: 'SUBMIT',
            targetSelector: '[data-testid="income-submit-btn"]', targetElementLabel: 'Submit Request Button', riskLevel: 'HIGH', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch income certificate petition', why: 'Revenue certificate requires revenue officer signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human approval mandatory.' }
          }
        ]
      },
      {
        id: 'residence_certificate',
        departmentId: 'revenue_land',
        title: 'Residence Certificate Application',
        subtitle: 'Revenue Department Domicile & Residence Status Validation',
        category: 'Revenue Certificates',
        officialPortal: '/portals/site6_revenue_certificates.html#/residence',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Submits application for certified residence / domicile status validation.',
        whatYouWillNeed: [
          'Applicant Full Name & Years of Residence',
          'Current residential address'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'years_of_residence', label: 'Years of Residence', type: 'text', placeholder: '10', defaultValue: '10', required: true, isSensitivePII: false },
          { id: 'address', label: 'Residential Address', type: 'text', placeholder: 'Plot 42, Green Valley Enclave, Bengaluru', defaultValue: 'Plot 42, Green Valley Enclave, Bengaluru', required: true, isSensitivePII: true, piiTokenName: 'ADDRESS_TOKEN_71' }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Residence Certificate Portal', description: 'Open Residence Certificate portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site6_revenue_certificates.html#/residence', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site6_revenue_certificates.html#/residence',
            explanation: { intent: 'Access Residence Certificate gateway', why: 'Directs Playwright agent to revenue fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Applicant & Residence Details', description: 'Enter name, years of residence, and address.', action: 'TYPE',
            targetSelector: '[data-testid="residence-fullname-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate residence status dossier', why: 'Fills inputs via testids.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Field completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Residence Certificate Request', description: 'Submit application to Revenue officer.', action: 'SUBMIT',
            targetSelector: '[data-testid="residence-submit-btn"]', targetElementLabel: 'Submit Request Button', riskLevel: 'HIGH', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch residence certificate petition', why: 'Domicile validation mandates human signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human signoff required.' }
          }
        ]
      }
    ]
  },
  {
    id: 'legal_certificates',
    name: 'Judicial & Notary',
    code: 'LEGAL-E-STAMP-GOV',
    iconName: 'Scale',
    badge: 'Judicial & Notary',
    portalUrl: '/portals/site6_revenue_certificates.html#/marriage',
    description: 'E-Stamp paper purchase, general power of attorney, legal heir certificates, marriage registration, and non-encumbrance declarations.',
    services: [
      {
        id: 'marriage_registration',
        departmentId: 'legal_certificates',
        title: 'Marriage Registration Application',
        subtitle: 'Judicial Sub-Registrar Office Marriage Certificate Issuance',
        category: 'Legal Registrations',
        officialPortal: '/portals/site6_revenue_certificates.html#/marriage',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'COMPLEX',
        estimatedMinutes: 4,
        requiresHITLApproval: true,
        whatItDoes: 'Submits formal petition for statutory marriage registration before sub-registrar.',
        whatYouWillNeed: [
          'Applicant Name & Spouse Full Name',
          'Date of Marriage & Registrar Office Location'
        ],
        requiredDocs: [],
        fields: [
          { id: 'applicant_name', label: 'Applicant Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'spouse_name', label: 'Spouse Full Name', type: 'text', placeholder: 'Karthik M', defaultValue: 'Karthik M', required: true, isSensitivePII: true, piiTokenName: 'SPOUSE_NAME_05' },
          { id: 'marriage_date', label: 'Date of Marriage', type: 'date', defaultValue: '2025-11-20', required: true, isSensitivePII: false },
          { id: 'registrar_office', label: 'Place / Sub-Registrar Office', type: 'text', placeholder: 'Sub-Registrar Office, Jayanagar', defaultValue: 'Sub-Registrar Office, Jayanagar', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Marriage Registration Portal', description: 'Open Judicial Marriage Registration portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site6_revenue_certificates.html#/marriage', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site6_revenue_certificates.html#/marriage',
            explanation: { intent: 'Access Marriage Registration gateway', why: 'Directs Playwright agent to judicial fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Applicant, Spouse & Marriage Details', description: 'Enter applicant name, spouse name, marriage date, and registrar office.', action: 'TYPE',
            targetSelector: '[data-testid="marriage-applicant-input"]', targetElementLabel: 'Applicant Name Input', fieldKey: 'applicant_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate marriage registration petition', why: 'Fills input fields via testid selectors.', evidence: ['Inputs populated'], policyRule: 'WORKFLOW-01: Field completion.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Submit Marriage Application', description: 'Submit petition to Sub-Registrar desk.', action: 'SUBMIT',
            targetSelector: '[data-testid="marriage-submit-btn"]', targetElementLabel: 'Submit Application Button', riskLevel: 'CRITICAL', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch statutory marriage registration', why: 'Judicial registration requires human officer signoff.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Human signoff mandatory.' }
          }
        ]
      }
    ]
  },
  {
    id: 'employment',
    name: 'National Career Portal',
    code: 'NCS-LABOUR-GOV',
    iconName: 'Briefcase',
    badge: 'National Career Portal',
    portalUrl: '/portals/site1_ncs.html',
    description: 'National Career Service (NCS) job registration, labour welfare benefits, e-Shram unorganized worker cards, and skill certifications.',
    services: [
      {
        id: 'ncs_job_registration',
        departmentId: 'employment',
        title: 'NCS Job Registration',
        subtitle: 'National Career Service Candidate Registration & Skill Profile Management',
        category: 'Job Registration',
        officialPortal: '/portals/site1_ncs.html#/ncs-registration',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 2,
        requiresHITLApproval: false,
        whatItDoes: 'Registers job seekers on the National Career Portal database with qualification and sector preferences.',
        whatYouWillNeed: [
          'Full legal name and date of birth',
          'Active 10-digit mobile number and email address',
          'Highest educational qualification and experience details'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '2004-01-01', required: true, isSensitivePII: true, piiTokenName: 'DOB_TOKEN_12' },
          { id: 'mobile', label: 'Mobile Contact Number', type: 'tel', placeholder: '9845012345', defaultValue: '9845012345', required: true, isSensitivePII: true, piiTokenName: 'PHONE_TOKEN_55' },
          { id: 'email', label: 'Email Address', type: 'email', placeholder: 'priya@example.com', defaultValue: 'priya@example.com', required: true, isSensitivePII: true, piiTokenName: 'EMAIL_TOKEN_33' },
          { id: 'qualification', label: 'Highest Qualification', type: 'select', options: ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate'], defaultValue: "Bachelor's Degree", required: true, isSensitivePII: false },
          { id: 'sector', label: 'Preferred Job Sector', type: 'select', options: ['Information Technology', 'Healthcare', 'Manufacturing', 'Education', 'Banking & Finance'], defaultValue: 'Information Technology', required: true, isSensitivePII: false },
          { id: 'years_experience', label: 'Years of Experience', type: 'text', placeholder: '2', defaultValue: '2', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to NCS Job Registration', description: 'Open NCS registration form.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site1_ncs.html#/ncs-registration', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site1_ncs.html#/ncs-registration',
            explanation: { intent: 'Access registration page', why: 'Directs Playwright agent to target test fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Local test domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Personal Details', description: 'Enter applicant full name, DOB, mobile, and email.', action: 'TYPE',
            targetSelector: '[data-testid="ncs-fullname-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate candidate identity details', why: 'Fills candidate information with testid priorities.', evidence: ['Element data-testid="ncs-fullname-input" matched'], policyRule: 'PII-POL-02: Local tokenization active.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Select Qualification & Sector', description: 'Choose education level and preferred sector.', action: 'SELECT',
            targetSelector: '[data-testid="ncs-qualification-select"]', targetElementLabel: 'Qualification Dropdown', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'combobox',
            explanation: { intent: 'Specify candidate credentials', why: 'Maps dropdown option using target data-testid.', evidence: ['Selected Bachelor degree'], policyRule: 'WORKFLOW-01: Mandatory field populated.' }
          },
          {
            id: 'S4', stepNumber: 4, title: 'Submit Job Registration', description: 'Click registration submit button and extract fake NCS ID.', action: 'SUBMIT',
            targetSelector: '[data-testid="ncs-submit-btn"]', targetElementLabel: 'Submit Registration Button', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'button',
            explanation: { intent: 'Dispatch registration form', why: 'Triggers in-browser mock submission and generates confirmation ID.', evidence: ['data-testid="confirmation-panel" visible'], policyRule: 'VERIF-POL-01: Confirmation ID generated.' }
          }
        ]
      },
      {
        id: 'eshram_worker_card',
        departmentId: 'employment',
        title: 'e-Shram Unorganized Worker Card Application',
        subtitle: 'Multi-step Unorganized Labour Social Security Card Application',
        category: 'Social Security',
        officialPortal: '/portals/site1_ncs.html#/eshram-application',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: false,
        whatItDoes: 'Issues digital e-Shram worker identification card through a multi-step demographic & occupation form.',
        whatYouWillNeed: [
          'Full Name & 12-digit Aadhaar number',
          'Date of birth & occupation category',
          'Monthly income range, state, and district'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', placeholder: '849249103841', defaultValue: '849249103841', required: true, isSensitivePII: true, piiTokenName: 'AADHAAR_TOKEN_94' },
          { id: 'dob', label: 'Date of Birth', type: 'date', defaultValue: '2004-01-01', required: true, isSensitivePII: true, piiTokenName: 'DOB_TOKEN_12' },
          { id: 'occupation_category', label: 'Occupation Category', type: 'select', options: ['Construction', 'Domestic Work', 'Agriculture', 'Street Vendor', 'Other'], defaultValue: 'Construction', required: true, isSensitivePII: false },
          { id: 'income_range', label: 'Monthly Income Range', type: 'select', options: ['Below ₹10,000', '₹10,000 - ₹15,000', '₹15,000 - ₹20,000', 'Above ₹20,000'], defaultValue: 'Below ₹10,000', required: true, isSensitivePII: false },
          { id: 'state', label: 'State', type: 'select', options: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Delhi'], defaultValue: 'Karnataka', required: true, isSensitivePII: false },
          { id: 'district', label: 'District', type: 'select', options: ['Bengaluru Urban', 'Mumbai City', 'Chennai', 'Central Delhi'], defaultValue: 'Bengaluru Urban', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to e-Shram Application', description: 'Open e-Shram multi-step application form.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site1_ncs.html#/eshram-application', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site1_ncs.html#/eshram-application',
            explanation: { intent: 'Access e-Shram application', why: 'Directs Playwright agent to target test fixture.', evidence: ['URL verified'], policyRule: 'SEC-POL-01: Local test domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Step 1: Fill Personal Details & Click Next', description: 'Input personal details and click Next to advance step.', action: 'TYPE',
            targetSelector: '[data-testid="eshram-fullname-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Complete Step 1 personal details', why: 'Populates name, aadhaar, dob before advancing.', evidence: ['data-testid="eshram-next-btn" enabled'], policyRule: 'WORKFLOW-02: Multi-step advancement rule.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Step 2: Fill Occupation & Location Details', description: 'Select occupation category, income range, state, and district.', action: 'SELECT',
            targetSelector: '[data-testid="eshram-occupation-select"]', targetElementLabel: 'Occupation Dropdown', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'combobox',
            explanation: { intent: 'Specify worker category', why: 'Populates Step 2 dropdown options.', evidence: ['Dropdown values selected'], policyRule: 'WORKFLOW-01: Step 2 validation.' }
          },
          {
            id: 'S4', stepNumber: 4, title: 'Submit e-Shram Application', description: 'Submit application and verify card issuance.', action: 'SUBMIT',
            targetSelector: '[data-testid="eshram-submit-btn"]', targetElementLabel: 'Submit Worker Card Button', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'button',
            explanation: { intent: 'Generate e-Shram card', why: 'Executes form submit and asserts confirmation UAN card.', evidence: ['data-testid="confirmation-panel" visible'], policyRule: 'VERIF-POL-01: Confirmation panel active.' }
          }
        ]
      }
    ]
  },
  {
    id: 'social_welfare',
    name: 'Labour Welfare & Skills Board',
    code: 'LWSB-BENEFITS-GOV',
    iconName: 'HeartHandshake',
    badge: 'Labour Board',
    portalUrl: '/portals/site2_welfare.html',
    description: 'Labour welfare benefit claims, worker assistance funds, skill certification enrollment, and vocational training.',
    services: [
      {
        id: 'labour_welfare_claim',
        departmentId: 'social_welfare',
        title: 'Labour Welfare Benefit Claim',
        subtitle: 'State Worker Benefit Claim Disbursement & Assistance Portal',
        category: 'Welfare Claims',
        officialPortal: '/portals/site2_welfare.html#/welfare-claim',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 3,
        requiresHITLApproval: true,
        whatItDoes: 'Processes medical, maternity, accident, and educational welfare claim applications for registered workers.',
        whatYouWillNeed: [
          'Worker Registration ID & Claim Type selection',
          'Claim amount & supporting document file',
          'Bank Account Number and IFSC Code',
          'Checked mandatory legal declaration'
        ],
        requiredDocs: [],
        fields: [
          { id: 'worker_id', label: 'Worker ID', type: 'text', placeholder: 'WRK-984012', defaultValue: 'WRK-984012', required: true, isSensitivePII: true, piiTokenName: 'WORKER_ID_77' },
          { id: 'claim_type', label: 'Claim Type', type: 'select', options: ['Medical', 'Maternity', 'Accident', 'Education Assistance'], defaultValue: 'Medical', required: true, isSensitivePII: false },
          { id: 'claim_amount', label: 'Claim Amount', type: 'text', placeholder: '15000', defaultValue: '15000', required: true, isSensitivePII: false },
          { id: 'bank_account_number', label: 'Bank Account Number', type: 'text', placeholder: '984102941029', defaultValue: '984102941029', required: true, isSensitivePII: true, piiTokenName: 'BANK_TOKEN_91' },
          { id: 'ifsc_code', label: 'Bank IFSC Code', type: 'text', placeholder: 'SBIN0004120', defaultValue: 'SBIN0004120', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Welfare Benefit Claim Portal', description: 'Open welfare benefit claim portal.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site2_welfare.html#/welfare-claim', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site2_welfare.html#/welfare-claim',
            explanation: { intent: 'Access welfare claim page', why: 'Directs agent to target test fixture.', evidence: ['URL matched'], policyRule: 'SEC-POL-01: Local test domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Claim & Banking Identifiers', description: 'Enter worker ID, claim type, claim amount, bank account, and IFSC.', action: 'TYPE',
            targetSelector: '[data-testid="welfare-workerid-input"]', targetElementLabel: 'Worker ID Input', fieldKey: 'worker_id', piiTokenKey: 'WORKER_ID_77', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Fill claim parameters', why: 'Populates benefit reimbursement request fields.', evidence: ['Values entered into form'], policyRule: 'WORKFLOW-01: Field completion check.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Toggle Mandatory Legal Declaration Checkbox', description: 'Check required statutory declaration checkbox to enable submit button.', action: 'CLICK',
            targetSelector: '[data-testid="welfare-declaration-checkbox"]', targetElementLabel: 'Legal Declaration Checkbox', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'checkbox',
            explanation: { intent: 'Enable disabled submit button', why: 'Playwright disabled-state testing requirement.', evidence: ['Submit button enabled'], policyRule: 'LEGAL-POL-01: Declaration required.' }
          },
          {
            id: 'S4', stepNumber: 4, title: 'Submit Benefit Claim Request', description: 'Click submit button and receive claim reference number.', action: 'SUBMIT',
            targetSelector: '[data-testid="welfare-submit-btn"]', targetElementLabel: 'Submit Claim Button', riskLevel: 'HIGH', requiresHITL: true, expectedDomRole: 'button',
            explanation: { intent: 'Commit claim application', why: 'Generates claim reference ID with Under Review status.', evidence: ['data-testid="confirmation-panel" active'], policyRule: 'HITL-POL-01: Benefit claim signoff.' }
          }
        ]
      },
      {
        id: 'skill_certification',
        departmentId: 'social_welfare',
        title: 'Skill Certification Enrollment',
        subtitle: 'Vocational Training & Skill Development Enrollment Portal',
        category: 'Skill Training',
        officialPortal: '/portals/site2_welfare.html#/skill-certification',
        allowedDomains: ['127.0.0.1', 'localhost'],
        complexity: 'MODERATE',
        estimatedMinutes: 2,
        requiresHITLApproval: false,
        whatItDoes: 'Enrolls candidate into specialized vocational courses with real-time dynamic course fee and duration state updates.',
        whatYouWillNeed: [
          'Full candidate name and mobile contact number',
          'Selected skill course (Electrician, Plumbing, Tailoring, Data Entry, Welding)',
          'Preferred training institute center and batch start date'
        ],
        requiredDocs: [],
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Priya R K', defaultValue: 'Priya R K', required: true, isSensitivePII: true, piiTokenName: 'USER_NAME_42' },
          { id: 'mobile', label: 'Mobile Contact Number', type: 'tel', placeholder: '9845012345', defaultValue: '9845012345', required: true, isSensitivePII: true, piiTokenName: 'PHONE_TOKEN_55' },
          { id: 'course', label: 'Select Skill Course', type: 'select', options: ['Electrician', 'Plumbing', 'Tailoring', 'Data Entry', 'Welding'], defaultValue: 'Electrician', required: true, isSensitivePII: false },
          { id: 'training_center', label: 'Preferred Training Center', type: 'select', options: ['Govt ITI Bengaluru Central', 'Regional Skill Institute Mumbai', 'Apex Vocational Center Chennai', 'Delhi Kaushal Vikas Kendra'], defaultValue: 'Govt ITI Bengaluru Central', required: true, isSensitivePII: false },
          { id: 'preferred_batch_date', label: 'Preferred Batch Date', type: 'date', defaultValue: '2026-09-15', required: true, isSensitivePII: false }
        ],
        steps: [
          {
            id: 'S1', stepNumber: 1, title: 'Navigate to Skill Certification Portal', description: 'Open skill course enrollment page.', action: 'NAVIGATE',
            targetSelector: 'window.location', targetElementLabel: '/portals/site2_welfare.html#/skill-certification', riskLevel: 'LOW', requiresHITL: false, expectedPageUrl: '/portals/site2_welfare.html#/skill-certification',
            explanation: { intent: 'Access skill enrollment page', why: 'Directs agent to target test fixture.', evidence: ['URL matched'], policyRule: 'SEC-POL-01: Local test domain allowlist.' }
          },
          {
            id: 'S2', stepNumber: 2, title: 'Fill Candidate Contact Details', description: 'Enter full name and mobile number.', action: 'TYPE',
            targetSelector: '[data-testid="skill-name-input"]', targetElementLabel: 'Full Name Input', fieldKey: 'full_name', piiTokenKey: 'USER_NAME_42', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'textbox',
            explanation: { intent: 'Populate candidate details', why: 'Fills contact fields with data-testid selectors.', evidence: ['Name and mobile populated'], policyRule: 'WORKFLOW-01: Form population.' }
          },
          {
            id: 'S3', stepNumber: 3, title: 'Select Course & Verify Dynamic Fee/Duration', description: 'Select course from dropdown and verify dynamic fee & duration elements update.', action: 'SELECT',
            targetSelector: '[data-testid="skill-course-select"]', targetElementLabel: 'Course Selection Dropdown', riskLevel: 'LOW', requiresHITL: false, expectedDomRole: 'combobox',
            explanation: { intent: 'Verify dynamic content updates', why: 'Playwright dynamic text content assertion test.', evidence: ['data-testid="skill-course-fee" updated to ₹2,500'], policyRule: 'VERIF-POL-02: Dynamic DOM update assertion.' }
          },
          {
            id: 'S4', stepNumber: 4, title: 'Submit Course Enrollment Request', description: 'Click submit button and receive Enrollment ID + QR placeholder.', action: 'SUBMIT',
            targetSelector: '[data-testid="skill-submit-btn"]', targetElementLabel: 'Complete Enrollment Button', riskLevel: 'MEDIUM', requiresHITL: false, expectedDomRole: 'button',
            explanation: { intent: 'Complete course enrollment', why: 'Generates Enrollment ID and renders QR placeholder.', evidence: ['data-testid="skill-qr-placeholder" visible'], policyRule: 'VERIF-POL-01: Enrollment verification.' }
          }
        ]
      }
    ]
  }
];

export const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'HAPPY_PATH',
    title: 'Standard Certified Flow (Happy Path)',
    tag: '100% PASS',
    description: 'Golden-path workflow with DOM validation, zero anomalies, high confidence (0.98+), and automated browser step completion.',
    expectedOutcome: 'Flawless execution through all standalone test portal steps.'
  },
  {
    id: 'WORKFLOW_DRIFT',
    title: 'Portal UI Selector Drift & Recovery',
    tag: 'ANOMALY DETECTED',
    description: 'Simulates portal updating button selector from data-testid to custom target. Confidence drops to 61%, triggering recovery.',
    injectedAnomaly: 'Button selector dynamically altered in DOM at Step 4.',
    expectedOutcome: 'Execution safely pauses; Playwright agent falls back to data-testid priority matching.'
  },
  {
    id: 'CONTRADICTION_DETECTED',
    title: 'Input Validation & Contradiction Alert',
    tag: 'CONTRADICTION ALERT',
    description: 'Simulates mobile/Aadhaar input mismatching statutory validation format.',
    injectedAnomaly: 'Validation error visible via data-testid="error-*"',
    expectedOutcome: 'Automated mutation blocked. Visual discrepancy badge displayed with self-correction rules.'
  }
];
