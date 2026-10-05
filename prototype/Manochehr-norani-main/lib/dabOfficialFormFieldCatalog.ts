import { DAB_OFFICIAL_FORMS } from './dabOfficialFormRegistry';

export type DabFieldType = 'text' | 'date' | 'number' | 'textarea';
export type DabOfficialField = { key: string; label: string; type?: DabFieldType; required?: boolean };

const requestFields: DabOfficialField[] = [
  { key: 'applicantName', label: 'نام درخواست‌کننده', required: true },
  { key: 'applicationDate', label: 'تاریخ درخواست', type: 'date', required: true },
  { key: 'applicationReference', label: 'شماره درخواست / مرجع' },
  { key: 'details', label: 'توضیحات و معلومات لازم', type: 'textarea' },
  { key: 'supportingDocuments', label: 'اسناد حمایوی', type: 'textarea' },
];

const companyFields: DabOfficialField[] = [
  { key: 'companyName', label: 'نام رسمی شرکت', required: true },
  { key: 'licenseNo', label: 'شماره جواز' },
  { key: 'province', label: 'ولایت' },
  { key: 'district', label: 'ولسوالی / ناحیه' },
  { key: 'address', label: 'آدرس مکمل', type: 'textarea' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'email', label: 'آدرس برقی' },
];

const personFields: DabOfficialField[] = [
  { key: 'fullName', label: 'نام و تخلص', required: true },
  { key: 'fatherName', label: 'نام پدر', required: true },
  { key: 'identityNo', label: 'شماره تذکره' },
  { key: 'education', label: 'سویه تحصیلی' },
  { key: 'field', label: 'رشته تحصیلی' },
  { key: 'phone', label: 'شماره تماس' },
  { key: 'address', label: 'آدرس', type: 'textarea' },
];

const agencyFields: DabOfficialField[] = [
  { key: 'agencyName', label: 'نام نمایندگی', required: true },
  { key: 'agencyNo', label: 'شماره نمایندگی / اجازه‌نامه' },
  { key: 'agencyLocation', label: 'موقعیت نمایندگی' },
  { key: 'agencyAddress', label: 'آدرس نمایندگی', type: 'textarea' },
  { key: 'representativeFullName', label: 'نام نماینده باصلاحیت', required: true },
  { key: 'representativeFatherName', label: 'نام پدر نماینده' },
  { key: 'representativeIdentityNo', label: 'شماره تذکره نماینده' },
  { key: 'representativeEducation', label: 'سویه تحصیلی نماینده' },
  { key: 'representativePhone', label: 'شماره تماس نماینده' },
];

const byCategory: Record<string, DabOfficialField[]> = {
  licensing: [...companyFields, ...requestFields, { key: 'capital', label: 'سرمایه', type: 'number' }, { key: 'shareholders', label: 'مشخصات سهمداران', type: 'textarea' }, { key: 'businessScope', label: 'نوع و ساحه فعالیت', type: 'textarea' }],
  company: [...companyFields, ...personFields, { key: 'position', label: 'موقف / سمت در شرکت' }, { key: 'sharePercent', label: 'فیصدی سهم', type: 'number' }, { key: 'tin', label: 'شماره تشخیصیه مالیاتی' }],
  representative: [...companyFields, ...agencyFields, ...requestFields],
  renewal: [...companyFields, ...requestFields, { key: 'expiryDate', label: 'تاریخ ختم جواز', type: 'date' }, { key: 'authorizedName', label: 'شخص مجاز' }, { key: 'changes', label: 'تغییرات و معلومات به‌روزشده', type: 'textarea' }],
  compliance: [...companyFields, ...requestFields, { key: 'declaration', label: 'متن تعهد / اقرار', type: 'textarea', required: true }, { key: 'signatory', label: 'نام و سمت امضاکننده', required: true }],
  change: [...companyFields, ...requestFields, { key: 'oldValue', label: 'معلومات قبلی', type: 'textarea', required: true }, { key: 'newValue', label: 'معلومات جدید', type: 'textarea', required: true }, { key: 'reason', label: 'دلیل تغییر', type: 'textarea' }, { key: 'effectiveDate', label: 'تاریخ تطبیق', type: 'date' }],
  suspension: [...companyFields, ...requestFields, { key: 'suspensionDate', label: 'تاریخ تعلیق', type: 'date' }, { key: 'reason', label: 'دلیل تعلیق', type: 'textarea', required: true }],
  closure: [...companyFields, ...requestFields, { key: 'closureDate', label: 'تاریخ ترک پیشه', type: 'date', required: true }, { key: 'reason', label: 'دلیل ترک پیشه', type: 'textarea' }, { key: 'settlement', label: 'تصفیه حساب و اسناد', type: 'textarea' }],
  commencement: [...companyFields, { key: 'approvedLicenseNo', label: 'شماره جواز تأییدشده' }, { key: 'authorizedPerson', label: 'شخص مجاز' }, { key: 'operatingAddress', label: 'آدرس محل فعالیت', type: 'textarea' }, { key: 'commencementDate', label: 'تاریخ آغاز فعالیت', type: 'date' }],
  exchange: [...companyFields, ...requestFields, { key: 'exchangeBusinessName', label: 'نام صرافی', required: true }, { key: 'responsiblePerson', label: 'شخص مسئول / منشی' }, { key: 'licenseReference', label: 'شماره جواز / مرجع' }],
  'money-services': [...companyFields, ...requestFields, { key: 'serviceProviderName', label: 'نام عرضه‌کننده خدمات پولی', required: true }, { key: 'responsiblePerson', label: 'شخص مسئول / منشی' }, { key: 'licenseReference', label: 'شماره جواز / مرجع' }],
  'supporting-documents': [...companyFields, { key: 'documentTitle', label: 'عنوان سند', required: true }, { key: 'content', label: 'محتوا و جزئیات', type: 'textarea', required: true }, { key: 'preparedBy', label: 'ترتیب‌کننده / مسئول' }],
};

export const DAB_OFFICIAL_FORM_FIELDS: Record<string, DabOfficialField[]> = Object.fromEntries(
  DAB_OFFICIAL_FORMS.map((form) => [form.id, byCategory[form.category] ?? requestFields]),
);

export function getDabOfficialFormFields(id: string): DabOfficialField[] {
  const fields = DAB_OFFICIAL_FORM_FIELDS[id];
  if (!fields || fields.length === 0) throw new Error(`Missing dedicated DAB field definition for ${id}`);
  return fields;
}
