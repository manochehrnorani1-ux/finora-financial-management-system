export type DABPartyRole = 'shareholder' | 'director' | 'authorized_representative' | 'compliance_officer' | 'finance_officer';
export type DABDocumentCategory = 'license' | 'identity' | 'tax' | 'criminal_clearance' | 'financial' | 'corporate' | 'guarantee' | 'photo' | 'correspondence' | 'other';
export type DABReviewDecision = 'pending' | 'approved' | 'rejected' | 'more_information';

export interface DABParty {
  id: string;
  companyId: string;
  fullName: string;
  role: DABPartyRole;
  identityType?: 'tazkira' | 'passport' | 'other';
  identityNo?: string;
  ownershipPercent?: number;
  phone?: string;
  active: boolean;
}

export interface DABBranchRecord {
  id: string;
  companyId: string;
  name: string;
  address: string;
  managerName?: string;
  licenseNo?: string;
  active: boolean;
}

export interface DABDocumentRecord {
  id: string;
  companyId: string;
  applicationId: string;
  category: DABDocumentCategory;
  requirementKey?: string;
  title: string;
  fileName: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploaded' | 'under_review' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface DABComplianceRecord {
  companyId: string;
  applicationId: string;
  kycStatus: 'pending' | 'passed' | 'failed';
  amlStatus: 'pending' | 'passed' | 'failed';
  sanctionsStatus: 'pending' | 'passed' | 'failed';
  overallStatus: 'pending' | 'cleared' | 'blocked';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface DABRenewalAuditEvent {
  id: string;
  companyId: string;
  applicationId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  actorId: string;
  actorRole?: string;
  reason?: string;
  createdAt: string;
}

export interface DABRenewalCase {
  applicationId: string;
  companyId: string;
  licenseNo: string;
  applicationDate: string;
  expiryDate?: string;
  status: string;
  dabReferenceNo?: string;
  parties: DABParty[];
  branches: DABBranchRecord[];
  documents: DABDocumentRecord[];
  compliance?: DABComplianceRecord;
  notes?: string;
}

export function calculateCaseCompleteness(caseFile: DABRenewalCase) {
  const required = [
    Boolean(caseFile.licenseNo),
    Boolean(caseFile.applicationDate),
    caseFile.parties.length > 0,
    caseFile.documents.length > 0,
    caseFile.documents.some((d) => d.status === 'verified'),
    caseFile.compliance?.overallStatus === 'cleared',
  ];
  const completed = required.filter(Boolean).length;
  return { completed, total: required.length, percent: Math.round((completed / required.length) * 100) };
}

export function canFinalizeCase(caseFile: DABRenewalCase) {
  const completeness = calculateCaseCompleteness(caseFile);
  return completeness.percent === 100 && caseFile.status === 'approved';
}
