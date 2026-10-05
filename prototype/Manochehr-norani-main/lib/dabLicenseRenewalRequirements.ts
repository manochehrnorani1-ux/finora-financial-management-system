/**
 * DAB license-renewal requirements.
 *
 * Source: Da Afghanistan Bank, FXD/MSP Regulation, Article 15.
 * This module separates regulatory requirements from UI code.
 */

export type RenewalDocumentStatus = 'missing' | 'uploaded' | 'verified' | 'rejected';

export type RenewalDocumentKey =
  | 'originalLicense'
  | 'renewalFeeReceipt'
  | 'taxPaymentOrClearance'
  | 'criminalClearanceOwner'
  | 'criminalClearanceEmployees'
  | 'applicantPhotos'
  | 'updatedInitialApplicationInformation'
  | 'otherDabRequestedInformation';

export interface RenewalDocumentRequirement {
  key: RenewalDocumentKey;
  titleFa: string;
  required: boolean;
  legalBasis: string;
  descriptionFa: string;
  quantity?: number;
}

export const DAB_LICENSE_RENEWAL_REQUIREMENTS: RenewalDocumentRequirement[] = [
  { key: 'originalLicense', titleFa: 'اصل جواز فعالیت', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۱', descriptionFa: 'اصل جواز فعالیت برای بررسی و ثبت پرونده تمدید.' },
  { key: 'renewalFeeReceipt', titleFa: 'سند پرداخت فیس درخواست تمدید جواز', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۲', descriptionFa: 'رسید یا سند معتبر پرداخت فیس درخواست تمدید.' },
  { key: 'taxPaymentOrClearance', titleFa: 'رسید پرداخت مالیات یا تصدیق عدم باقی‌داری مالیاتی', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۳', descriptionFa: 'یکی از اسناد معتبر پرداخت مالیات یا تصدیق عدم باقی‌داری مالیاتی.' },
  { key: 'criminalClearanceOwner', titleFa: 'تصدیق عدم مسئولیت جنایی مالک / سهمداران مربوط', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۴', descriptionFa: 'تصدیق از مراجع ذیصلاح مطابق الزامات قابل تطبیق.' },
  { key: 'criminalClearanceEmployees', titleFa: 'تصدیق عدم مسئولیت جنایی کارمندان رسمی', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۴', descriptionFa: 'اسناد لازم برای کارمندان رسمی مشمول درخواست.' },
  { key: 'applicantPhotos', titleFa: 'عکس درخواست‌دهنده', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۵', descriptionFa: 'سه قطعه عکس درخواست‌دهنده.', quantity: 3 },
  { key: 'updatedInitialApplicationInformation', titleFa: 'معلومات و مدارک به‌روزشده درخواست اولیه', required: false, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۶', descriptionFa: 'در صورت بروز تغییرات عمده، معلومات و مدارک ضروری درخواست اولیه باید تجدید شود.' },
  { key: 'otherDabRequestedInformation', titleFa: 'سایر معلومات مورد مطالبه د افغانستان بانک', required: false, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۷', descriptionFa: 'برای مواردی که د افغانستان بانک حسب لزوم مطالبه می‌کند.' },
];

export const DAB_RENEWAL_STATUSES = ['draft', 'documents_pending', 'ready_for_submission', 'submitted', 'under_dab_review', 'additional_information_requested', 'approved', 'rejected', 'completed'] as const;
export type DabRenewalStatus = (typeof DAB_RENEWAL_STATUSES)[number];

export interface DabRenewalApplication {
  applicationId: string;
  companyId: string;
  licenseId: string;
  applicationDate: string;
  status: DabRenewalStatus;
  submittedAt?: string;
  completedAt?: string;
  dabReferenceNo?: string;
  majorChanges: boolean;
  notes?: string;
}

export interface DabRenewalDocumentRecord {
  requirementKey: RenewalDocumentKey;
  status: RenewalDocumentStatus;
  fileName?: string;
  storagePath?: string;
  downloadUrl?: string;
  documentNo?: string;
  issueDate?: string;
  expiryDate?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

/**
 * A renewal can only be marked ready when all mandatory requirements are verified.
 * verifiedKeys is controlled by the protected reviewer workflow.
 */
export function canSubmitDabRenewal(
  documents: DabRenewalDocumentRecord[],
  majorChanges: boolean,
  verifiedKeys?: RenewalDocumentKey[],
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const byKey = new Map(documents.map((item) => [item.requirementKey, item]));
  const protectedVerification = verifiedKeys !== undefined;
  const verified = new Set(verifiedKeys ?? []);

  for (const requirement of DAB_LICENSE_RENEWAL_REQUIREMENTS) {
    const conditional = requirement.key === 'updatedInitialApplicationInformation';
    const required = requirement.required || (conditional && majorChanges);
    if (!required) continue;

    const record = byKey.get(requirement.key);
    const isVerified = record?.status === 'verified' && (!protectedVerification || verified.has(requirement.key));
    if (!isVerified) missing.push(requirement.titleFa);
  }

  return { ok: missing.length === 0, missing };
}

export function renewalDeadlineInfo(expiryDate: string, applicationDate: string) {
  const expiry = new Date(expiryDate);
  const application = new Date(applicationDate);
  const minimumDays = 21;
  const daysBeforeExpiry = Math.ceil((expiry.getTime() - application.getTime()) / 86400000);
  return { daysBeforeExpiry, meetsThreeWeekRule: daysBeforeExpiry >= minimumDays };
}
