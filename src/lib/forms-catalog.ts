/**
 * FINORA Official Forms Catalog — Afghanistan
 *
 * Every entry is sourced from the official listing pages of Da Afghanistan Bank
 * (dab.gov.af — فورم‌های خدمات پولی / فورم‌های صرافی) and the Ministry of Finance
 * (mof.gov.af / ard.gov.af — فورمه‌جات). The `sourceUrl` points to the official
 * page where the form is published and `originalFileUrl` points to the original
 * downloadable form file published by the authority itself.
 *
 * Field structure reflects the standard layout of these Afghan government forms.
 * `mapping` values reference FINORA database paths (`customer.<field>`,
 * `case.<field>`, `org.<field>`) so forms can be auto-filled (خانه‌پری خودکار)
 * from the management panel. Fields without a mapping are filled by staff.
 */

export interface OfficialFormField {
  key: string;
  label: string;
  labelPs?: string;
  labelEn?: string;
  type?: "text" | "date" | "number" | "textarea" | "select";
  required?: boolean;
  mapping?: string;
  options?: string[];
  help?: string;
}

export interface OfficialFormDefinition {
  formKey: string;
  agency: string;
  formName: string;
  formNamePs?: string;
  formNameEn?: string;
  formNumber?: string;
  sourceUrl: string;
  originalFileUrl?: string;
  fields: OfficialFormField[];
}

const DAB_MSP_SOURCE = "https://dab.gov.af/dr/فورم-های-خدمات-پولی";
const DAB_FXD_SOURCE = "https://www.dab.gov.af/Licensing-Guidelines-Forms";
const MOF_SOURCE = "https://www.mof.gov.af/dr/فورمه-جات-0";
const ARD_SOURCE = "https://ard.gov.af/?c=tax-guidlines-dr&s=dari";

const APPLICANT_FIELDS: OfficialFormField[] = [
  { key: "company_name", label: "نام شرکت / نهاد متقاضی", type: "text", required: true, mapping: "customer.name" },
  { key: "father_name", label: "نام پدر / سرپرست", type: "text", mapping: "customer.fatherName" },
  { key: "national_id", label: "نمبر تذکره", type: "text", mapping: "customer.nationalId" },
  { key: "tin", label: "شماره تشخیصیه مالیه‌دهنده (TIN)", type: "text", mapping: "customer.tin" },
  { key: "license_number", label: "شماره جواز فعالیت", type: "text", mapping: "customer.licenseNumber" },
  { key: "phone", label: "شماره تماس", type: "text", required: true, mapping: "customer.phone" },
  { key: "email", label: "بریښنالیک", type: "text", mapping: "customer.email" },
  { key: "province", label: "ولایت", type: "text", mapping: "customer.province" },
  { key: "district", label: "ولسوالی / ناحیه", type: "text", mapping: "customer.district" },
  { key: "area", label: "ناحیه / قریه", type: "text", mapping: "customer.area" },
  { key: "address", label: "آدرس مکمل", type: "textarea", mapping: "customer.address" },
  { key: "activity", label: "نوع فعالیت اقتصادی", type: "text", mapping: "customer.activity" },
];

const CASE_FIELDS: OfficialFormField[] = [
  { key: "case_number", label: "شماره دوسیه FINORA", type: "text", mapping: "case.caseNumber" },
  { key: "case_opened", label: "تاریخ تشکیل دوسیه", type: "date", mapping: "case.openedAt" },
];

const SIGNATURE_FIELDS: OfficialFormField[] = [
  { key: "signer_name", label: "نام امضاکننده", type: "text", required: true },
  { key: "signer_position", label: "عنوان / سمت امضاکننده", type: "text" },
  { key: "request_date", label: "تاریخ درخواست", type: "date", required: true },
];

export const OFFICIAL_FORMS_CATALOG: OfficialFormDefinition[] = [
  /* ============ د افغانستان بانک — فورم‌های خدمات پولی ============ */
  {
    formKey: "dab-msp-new",
    agency: "DAB-MSP",
    formName: "فورم درخواستی ایجاد خدمات پولی",
    formNamePs: "د پولي خدمتونو د رامنځته کولو غوښتنلیک فورم",
    formNameEn: "Application to Establish Money Services",
    formNumber: "DAB-MSP-01",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%A7%DB%8C%D8%AC%D8%A7%D8%AF%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      ...APPLICANT_FIELDS,
      { key: "service_type", label: "نوع خدمت درخواستی", type: "select", required: true, options: ["انتقال پول", "تaduیه حواله", "صرافی اسعار", "صدور و پرداخت حواله", "سایر"] },
      { key: "start_date", label: "تاریخ پیشنهادی شروع فعالیت", type: "date", required: true },
      { key: "office_address", label: "آدرس محل فعالیت (والیت / ناحیه)", type: "textarea", required: true },
      { key: "share_capital", label: "مبلغ سرمایه اولیه (افغانی)", type: "number", required: true },
      { key: "shareholders", label: "اسامی سهمداران", type: "textarea" },
      { key: "undertaking_attached", label: "تعهدنامه ضمیمه شد", type: "select", options: ["بله", "نخیر"] },
      { key: "power_of_attorney", label: "وکالتنامه ضمیمه شد", type: "select", options: ["بله", "نخیر"] },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
      { key: "stamp", label: "مهر رسمی", type: "text", help: "پس از چاپ توسط کارمند امضا و مهر می‌شود" },
    ],
  },
  {
    formKey: "dab-msp-commitment",
    agency: "DAB-MSP",
    formName: "تعهدنامه عرضه‌کننده خدمات پولی",
    formNamePs: "د پولي خدمتونو د وړاندې کوونکي تعهد نامه",
    formNameEn: "Money Services Provider Undertaking",
    formNumber: "DAB-MSP-02",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D8%AA%D8%B9%D9%87%D8%AF%20%D9%86%D8%A7%D9%85%D9%87%20%D8%B9%D8%B1%D8%B6%D9%87%20%DA%A9%D9%86%D9%86%D8%AF%D9%87%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "commitment_text", label: "متن تعهد (رعایت قوانین، مقررات و رهنمودهای د افغانستان بانک)", type: "textarea", required: true },
      { key: "laws_acknowledged", label: "قوانین و مقررات کشور پذیرفته شد", type: "select", options: ["بله", "نخیر"], required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
      { key: "witness_name", label: "نام گواه", type: "text" },
      { key: "stamp", label: "مهر رسمی", type: "text" },
    ],
  },
  {
    formKey: "dab-msp-surrender",
    agency: "DAB-MSP",
    formName: "فورم درخواستی ترک پیشه خدمات پولی",
    formNamePs: "د پولي خدمتونو د ترک پیشې غوښتنلیک فورم",
    formNameEn: "Money Services Business Surrender Application",
    formNumber: "DAB-MSP-03",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%AA%D8%B1%DA%A9%20%D9%BE%DB%8C%D8%B4%D9%87%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "license_issue_date", label: "تاریخ صدور جواز", type: "date" },
      { key: "surrender_reason", label: "دلیل ترک پیشه", type: "textarea", required: true },
      { key: "outstanding_obligations", label: "تعهدات مالی باقی‌مانده (در صورت وجود)", type: "textarea" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-renewal",
    agency: "DAB-MSP",
    formName: "فورم درخواستی تمدید جواز خدمات پولی",
    formNamePs: "د پولي خدمتونو د جواز د تمدید غوښتنلیک فورم",
    formNameEn: "Money Services License Renewal Application",
    formNumber: "DAB-MSP-04",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%AA%D9%85%D8%AF%DB%8C%D8%AF%20%D8%AC%D9%88%D8%A7%D8%B2%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "license_expiry", label: "تاریخ ختم اعتبار جواز فعلی", type: "date", required: true },
      { key: "renewal_period", label: "دوره درخواستی تمدید", type: "select", options: ["یک سال", "دو سال", "سه سال"] },
      { key: "address_changed", label: "تغییر آدرس داشته است؟", type: "select", options: ["نخیر", "بله"] },
      ...APPLICANT_FIELDS.slice(6),
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-branch",
    agency: "DAB-MSP",
    formName: "فورم ایجاد نمایندگی خدمات پولی",
    formNamePs: "د پولي خدمتونو د نمایندګۍ رامنځته کولو فورم",
    formNameEn: "Money Services Branch Application",
    formNumber: "DAB-MSP-05",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%A7%DB%8C%D8%AC%D8%A7%D8%AF%20%D9%86%D9%85%D8%A7%DB%8C%D9%86%D8%AF%DA%AF%DB%8C%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "parent_company", label: "نام شرکت اصلی", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز شرکت اصلی", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "branch_address", label: "آدرس نمایندگی پیشنهادی", type: "textarea", required: true },
      { key: "branch_province", label: "ولایت نمایندگی", type: "text", required: true },
      { key: "branch_manager", label: "نام مدیر نمایندگی", type: "text", required: true },
      { key: "branch_manager_phone", label: "شماره تماس مدیر نمایندگی", type: "text" },
      { key: "opening_date", label: "تاریخ پیشنهادی افتتاح", type: "date" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-ownership",
    agency: "DAB-MSP",
    formName: "فورم درخواستی انتقال مالکیت خدمات پولی",
    formNamePs: "د پولي خدمتونو د مالکیت د انتقال غوښتنلیک فورم",
    formNameEn: "Money Services Ownership Transfer Application",
    formNumber: "DAB-MSP-06",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%A7%D9%86%D8%AA%D9%82%D8%A7%D9%84%20%D9%85%D8%A7%D9%84%DA%A9%DB%8C%D8%AA%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "transferor_name", label: "نام منتقل‌کننده (مالک فعلی)", type: "text", required: true },
      { key: "transferee_name", label: "نام متقاضی (مالک جدید)", type: "text", required: true },
      { key: "transfer_reason", label: "دلیل انتقال مالکیت", type: "textarea", required: true },
      { key: "share_percentage", label: "فیصد سهم منتقل‌شده", type: "number" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-suspension",
    agency: "DAB-MSP",
    formName: "فورم درخواستی تعلیق جواز خدمات پولی",
    formNamePs: "د پولي خدمتونو د جواز د تعلیق غوښتنلیک فورم",
    formNameEn: "Money Services License Suspension Application",
    formNumber: "DAB-MSP-07",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%AA%D8%B9%D9%84%DB%8C%D9%82%20%D8%AC%D9%88%D8%A7%D8%B2%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "suspension_reason", label: "دلیل درخواست تعلیق", type: "textarea", required: true },
      { key: "suspension_period", label: "دوره تعلیق درخواستی", type: "text", required: true },
      { key: "resume_date", label: "تاریخ پیشنهادی بازگشایی", type: "date" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-corrective-plan",
    agency: "DAB-MSP",
    formName: "پلان اصلاحی جهت رفع تعلیق جواز خدمات پولی",
    formNamePs: "د پولي خدمتونو د جواز د تعلیق د لېرې کولو لپاره اصلاحي پلان",
    formNameEn: "Corrective Action Plan for Lifting Money Services License Suspension",
    formNumber: "DAB-MSP-07B",
    sourceUrl: DAB_MSP_SOURCE,
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "tin", label: "نمبر تشخیصیه مالیه‌دهنده (TIN)", type: "text", mapping: "customer.tin" },
      { key: "suspension_reason", label: "دلیل تعلیق جواز", type: "textarea", required: true },
      { key: "suspension_letter_no", label: "نمبر مکتوب تعلیق", type: "text" },
      { key: "suspension_letter_date", label: "تاریخ مکتوب تعلیق", type: "date" },
      { key: "findings", label: "یافته‌ها / موارد تخلف", type: "textarea", required: true },
      { key: "corrective_actions", label: "اقدامات اصلاحی مرحله‌به‌مرحله (مرحله، مسئول، موعد، مبلغ)", type: "textarea", required: true },
      { key: "total_amount", label: "مبلغ مجموع تعهدات (افغانی)", type: "number" },
      { key: "evidence_attached", label: "اسناد حمایوی اجرای مراحل ضمیمه شد", type: "select", options: ["بله", "نخیر"] },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-name-change",
    agency: "DAB-MSP",
    formName: "فورم درخواستی تغییر نام خدمات پولی",
    formNamePs: "د پولي خدمتونو د نوم د بدلون غوښتنلیک فورم",
    formNameEn: "Money Services Name Change Application",
    formNumber: "DAB-MSP-08",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%AF%D8%B1%D8%AE%D9%88%D8%A7%D8%B3%D8%AA%DB%8C%20%D8%AA%D8%BA%DB%8C%D8%B1%20%D9%86%D8%A7%D9%85%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "old_name", label: "نام فعلی شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "new_name", label: "نام جدید پیشنهادی", type: "text", required: true },
      { key: "license_number", label: "شماره جواز", type: "text", required: true, mapping: "customer.licenseNumber" },
      { key: "change_reason", label: "دلیل تغییر نام", type: "textarea" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-guarantee-1",
    agency: "DAB-MSP",
    formName: "فورم ضمانت خدمات پولی ۱ (تضمین شخص)",
    formNamePs: "د پولي خدمتونو د تضمین فورم ۱",
    formNameEn: "Money Services Guarantee Form 1",
    formNumber: "DAB-MSP-09",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%B6%D9%85%D8%A7%D9%86%D8%AA%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C%20%201.docx",
    fields: [
      { key: "company_name", label: "نام شرکت خدمات پولی و صرافی", type: "text", required: true, mapping: "customer.name" },
      { key: "guarantor_name", label: "نام تضمین کننده", type: "text", required: true },
      { key: "guarantor_father", label: "نام پدر تضمین کننده", type: "text", required: true },
      { key: "guarantor_tazkira", label: "نمبر تذکره تضمین کننده", type: "text", required: true },
      { key: "guarantor_main_address", label: "آدرس تشبث اصلی تضمین کننده", type: "textarea", required: true },
      { key: "guarantor_current_address", label: "آدرس تشبث فعلی تضمین کننده", type: "textarea", required: true },
      { key: "guarantor_phone", label: "شماره تماس تضمین کننده", type: "text", required: true },
      { key: "guarantee_text", label: "متن تضمین (تعهد در صورت تخلف شرکت، اطلاع به د افغانستان بانک)", type: "textarea", required: true },
      { key: "guarantor_photo_note", label: "عکس تضمین کننده (در جایگاه مخصوص نصب می‌شود)", type: "text" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-guarantee-2",
    agency: "DAB-MSP",
    formName: "فورم ضمانت خدمات پولی ۲ (تضمین سهمداران)",
    formNamePs: "د پولي خدمتونو د تضمین فورم ۲",
    formNameEn: "Money Services Guarantee Form 2",
    formNumber: "DAB-MSP-10",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D8%B6%D9%85%D8%A7%D9%86%D8%AA%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C%202.docx",
    fields: [
      { key: "company_name", label: "نام شرکت خدمات پولی و صرافی", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "shareholders_list", label: "اسامی سهمداران و فیصد سهم", type: "textarea", required: true },
      { key: "guarantee_text", label: "متن تضمین مشترک سهمداران", type: "textarea", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-msp-responsible-person",
    agency: "DAB-MSP",
    formName: "فورم معرفی کارمند مسئول (منشی) خدمات پولی",
    formNamePs: "د پولي خدمتونو د مسوول کارمند د معرفي فورم",
    formNameEn: "Money Services Responsible Employee Introduction Form",
    formNumber: "DAB-MSP-11",
    sourceUrl: DAB_MSP_SOURCE,
    originalFileUrl: "https://dab.gov.af/sites/default/files/2020-09/%D9%81%D9%88%D8%B1%D9%85%20%D9%85%D8%B9%D8%B1%D9%81%DB%8C%20%DA%A9%D8%A7%D8%B1%D9%85%D9%86%D8%AF%20%D9%85%D8%B3%D8%A6%D9%88%D9%84%20%28%D9%85%D9%86%D8%B4%DB%8C%29%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D9%BE%D9%88%D9%84%DB%8C.docx",
    fields: [
      { key: "company_name", label: "نام شرکت", type: "text", required: true, mapping: "customer.name" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "employee_name", label: "نام کارمند مسئول (منشی)", type: "text", required: true },
      { key: "employee_father", label: "نام پدر کارمند", type: "text", required: true },
      { key: "employee_tazkira", label: "نمبر تذکره کارمند", type: "text", required: true },
      { key: "employee_phone", label: "شماره تماس کارمند", type: "text" },
      { key: "employee_address", label: "آدرس کارمند", type: "textarea" },
      { key: "position", label: "سمت / وظیفه", type: "text", required: true },
      { key: "introduction_text", label: "متن معرفی (تأیید صلاحیت و صحت معلومات)", type: "textarea", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "dab-fx-licensing-index",
    agency: "DAB-FXD",
    formName: "مجموعه فورم‌های جواز صرافی و خدمات پولی (فهرست مرجع)",
    formNamePs: "د صرافۍ او پولي خدمتونو د جواز فورمونو ټولګه",
    formNameEn: "FX Dealer & MSP Licensing Forms Index",
    sourceUrl: DAB_FXD_SOURCE,
    fields: [
      { key: "company_name", label: "نام متقاضی", type: "text", required: true, mapping: "customer.name" },
      { key: "tin", label: "TIN", type: "text", mapping: "customer.tin" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "form_required", label: "فورم مورد نیاز از فهرست رسمی", type: "text", required: true, help: "نام فورم دقیقاً مطابق صفحه رسمی د افغانستان بانک" },
      { key: "form_version_note", label: "یادداشت نسخه / اعتبار فورم", type: "textarea" },
      ...CASE_FIELDS,
    ],
  },

  /* ============ وزارت مالیه — فورمه‌جات مالیاتی ============ */
  {
    formKey: "mof-tin-application",
    agency: "MOF-ARD",
    formName: "فورم درخواست شماره تشخیصیه مالیه‌دهنده (TIN)",
    formNamePs: "د مالیه ورکوونکي پېژند شمېرې غوښتنلیک فورم",
    formNameEn: "Taxpayer Identification Number (TIN) Application",
    sourceUrl: "https://www.mof.gov.af/dr/%D8%A7%D8%B7%D9%84%D8%A7%D8%B9%DB%8C%D9%87-%D9%86%D9%85%D8%A8%D8%B1-%D8%AA%D8%B4%D8%AE%DB%8C%D8%B5%DB%8C%D9%87-%D9%85%D8%A7%D9%84%D9%8A%D9%87-%D8%AF%D9%87%D9%86%D8%AF%D9%87",
    fields: [
      { key: "applicant_name", label: "نام متقاضی", type: "text", required: true, mapping: "customer.name" },
      { key: "father_name", label: "نام پدر", type: "text", required: true, mapping: "customer.fatherName" },
      { key: "national_id", label: "نمبر تذکره / پاسپورت", type: "text", required: true, mapping: "customer.nationalId" },
      { key: "phone", label: "شماره تماس", type: "text", required: true, mapping: "customer.phone" },
      { key: "email", label: "بریښنالیک (اختیاری)", type: "text", mapping: "customer.email" },
      { key: "province", label: "ولایت", type: "text", required: true, mapping: "customer.province" },
      { key: "district", label: "ولسوالی", type: "text", mapping: "customer.district" },
      { key: "area", label: "ناحیه", type: "text", mapping: "customer.area" },
      { key: "address", label: "آدرس مکمل", type: "textarea", mapping: "customer.address" },
      { key: "applicant_type", label: "نوع متقاضی", type: "select", options: ["شخص حقیقی", "شخص حکمی / شرکت", "نهاد غیرتجارتی"], required: true },
      { key: "activity", label: "نوع فعالیت اقتصادی", type: "text", mapping: "customer.activity" },
      { key: "existing_tin", label: "TIN قبلی (در صورت تغییر معلومات)", type: "text" },
      ...CASE_FIELDS,
    ],
  },
  {
    formKey: "mof-annual-cit-return",
    agency: "MOF-ARD",
    formName: "اظهارنامه مالیاتی سالانه شرکت‌ها و بیلانس شیت",
    formNamePs: "د شرکتونو کلنی مالیاتي اظهارنامه او بیلانس شیټ",
    formNameEn: "Annual Corporate Income Tax Return & Balance Sheet",
    sourceUrl: "https://www.mof.gov.af/en/documents",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/%D8%B1%D9%87%D9%86%D9%85%D9%88%D8%AF%20%D8%B4%D9%85%D8%A7%D8%B1%D9%87%208-min(1).pdf",
    fields: [
      { key: "company_name", label: "نام شرکت / مالیه‌دهنده", type: "text", required: true, mapping: "customer.name" },
      { key: "tin", label: "TIN", type: "text", required: true, mapping: "customer.tin" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "fiscal_year", label: "سال مالی", type: "text", required: true },
      { key: "gross_income", label: "عواید ناخالص دوره", type: "number", required: true },
      { key: "allowable_expenses", label: "مصارف قابل مجرایی (ماده ۱۸)", type: "number", required: true },
      { key: "brt_paid", label: "مالیه انتفاعی پرداخت‌شده (کسر به عنوان مصرف)", type: "number" },
      { key: "exemptions", label: "معافیت‌ها", type: "number" },
      { key: "net_taxable", label: "عاید خالص مشمول مالیه", type: "number", required: true },
      { key: "income_tax_rate", label: "نرخ مالیه بر عایدات (۲۰٪)", type: "number", required: true },
      { key: "assessed_tax", label: "مالیه سنجش‌شده", type: "number", required: true },
      { key: "withholding_credit", label: "کسر کریدیت مالیات موضوعی پیش‌پرداخت‌شده", type: "number" },
      { key: "tax_payable", label: "خالص مالیه قابل تادیه", type: "number", required: true },
      { key: "loss_carryforward", label: "ضرر قابل انتقال (در صورت وجود)", type: "number" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-quarterly-brt-return",
    agency: "MOF-ARD",
    formName: "فورم اظهارنامه ربع‌وار مالیه معاملات انتفاعی (BRT)",
    formNamePs: "د انتفاعي مالیې ربعوار اظهارنامه فورم",
    formNameEn: "Quarterly Business Receipts Tax (BRT) Return",
    sourceUrl: "https://ard.gov.af/497/497",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2008%20-%20Tax%20Guide%20for%20Corporations%20and%20Limited%20Liability%20Companies-E-min.pdf",
    fields: [
      { key: "company_name", label: "نام شرکت / مالیه‌دهنده", type: "text", required: true, mapping: "customer.name" },
      { key: "tin", label: "TIN", type: "text", required: true, mapping: "customer.tin" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "quarter", label: "ربع سال مالی", type: "select", options: ["ربع اول", "ربع دوم", "ربع سوم", "ربع چهارم"], required: true },
      { key: "fiscal_year", label: "سال مالی", type: "text", required: true },
      { key: "gross_receipts", label: "سرجمع عواید ناخالص ربع", type: "number", required: true },
      { key: "brt_rate", label: "نرخ مالیه انتفاعی (۴٪ / ۲٪ / ۵٪ / ۱۰٪)", type: "number", required: true, help: "نرخ طبق ماده ۶۴ و رهنمود شماره ۳ وزارت مالیه" },
      { key: "brt_amount", label: "مبلغ مالیه انتفاعی", type: "number", required: true },
      { key: "previously_paid", label: "پیش‌پرداخت‌های پیشین این ربع", type: "number" },
      { key: "net_payable", label: "خالص قابل تادیه", type: "number", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-wage-wht-form",
    agency: "MOF-ARD",
    formName: "فورم راپور ماهوار و تحویلی بانک مالیه موضوعی معاشات (ماده ۵۸)",
    formNamePs: "د معاشاتو د موضوعي مالیې میاشتنی راپور او بانکي تحویلی فورم",
    formNameEn: "Monthly Wage Withholding Tax Report & Bank Deposit Form (Article 58)",
    sourceUrl: "https://www.mof.gov.af/en/guides",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2005%20-%20Wage%20Withholding%20Tax(2)(1)-min.pdf",
    fields: [
      { key: "employer_name", label: "نام کارفرما", type: "text", required: true, mapping: "customer.name" },
      { key: "employer_tin", label: "TIN کارفرما", type: "text", required: true, mapping: "customer.tin" },
      { key: "month", label: "ماه", type: "text", required: true },
      { key: "employee_name", label: "نام کارمند", type: "text", required: true },
      { key: "employee_id", label: "نمبر تذکره / کود کارمند", type: "text" },
      { key: "monthly_salary", label: "معاش ماهوار (افغانی)", type: "number", required: true },
      { key: "withholding_tax", label: "مالیه موضوعی طبق جدول پلکانی", type: "number", required: true, help: "تا ۵,۰۰۰ معاف · ۵,۰۰۱–۱۲,۵۰۰: ۲٪ · ۱۲,۵۰۱–۱۰۰,۰۰۰: ۱۵۰ + ۱۰٪ · بالای ۱۰۰,۰۰۰: ۸,۹۰۰ + ۲۰٪" },
      { key: "remittance_date", label: "تاریخ تحویل بانک", type: "date", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-rent-wht-form",
    agency: "MOF-ARD",
    formName: "فورم سنجش و تحویلی مالیه موضوعی کرایه عقارات (ماده ۵۹)",
    formNamePs: "د جاګرو د کرایې د موضوعي مالیې سنجش او تحویلی فورم",
    formNameEn: "Rental Withholding Tax Calculation & Deposit Form (Article 59)",
    sourceUrl: "https://www.mof.gov.af/en/guides",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2001%20-%20Withholding%20Tax%20on%20Rental%20Services-min.pdf",
    fields: [
      { key: "tenant_name", label: "نام مستاجر", type: "text", required: true, mapping: "customer.name" },
      { key: "tenant_tin", label: "TIN مستاجر", type: "text", mapping: "customer.tin" },
      { key: "landlord_name", label: "نام موجر", type: "text", required: true },
      { key: "landlord_tin", label: "TIN موجر", type: "text" },
      { key: "property_address", label: "آدرس ملک مستاجره", type: "textarea", required: true },
      { key: "monthly_rent", label: "کرایه ماهوار (افغانی)", type: "number", required: true },
      { key: "rent_period", label: "دوره کرایه", type: "text" },
      { key: "withholding_tax", label: "مالیه موضوعی (۰٪ / ۱۰٪ / ۱۵٪ مقطوع)", type: "number", required: true, help: "زیر ۱۰,۰۰۰ معاف · ۱۰,۰۰۰–۱۰۰,۰۰۰: ۱۰٪ · بالای ۱۰۰,۰۰۰: ۱۵٪" },
      { key: "remittance_date", label: "تاریخ تحویل به ریاست عمومی عواید", type: "date", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-contractor-wht-m16",
    agency: "MOF-ARD",
    formName: "فورم مالیه موضوعی قراردادی‌ها — سنجش و تحویلی بانک (ماده ۷۲ / م-۱۶)",
    formNamePs: "د قراردادي موضوعي مالیې سنجش او بانکي تحویلی فورم",
    formNameEn: "Contractor Withholding Tax Calculation & Bank Deposit (Article 72 / M-16)",
    sourceUrl: "https://www.mof.gov.af/en/guides",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2021%20-%20Withholding%20Tax%20on%20Contractor%20Services-min.pdf",
    fields: [
      { key: "payer_name", label: "نام تادیه‌کننده", type: "text", required: true, mapping: "customer.name" },
      { key: "payer_tin", label: "TIN تادیه‌کننده", type: "text", required: true, mapping: "customer.tin" },
      { key: "contractor_name", label: "نام قراردادی / متقاضی", type: "text", required: true },
      { key: "contractor_license", label: "شماره جواز قراردادی (در صورت وجود)", type: "text" },
      { key: "contract_amount", label: "مبلغ ناخالص قرارداد (افغانی)", type: "number", required: true },
      { key: "contract_subject", label: "موضوع قرارداد", type: "textarea", required: true },
      { key: "contract_date", label: "تاریخ قرارداد", type: "date", required: true },
      { key: "withholding_rate", label: "نرخ وضع مالیه (۲٪ دارای جواز / ۷٪ بدون جواز)", type: "number", required: true },
      { key: "withholding_amount", label: "مبلغ مالیه موضوعی", type: "number", required: true },
      { key: "net_payable_to_contractor", label: "مبلغ قابل تادیه به قراردادی", type: "number", required: true },
      { key: "bank_deposit_date", label: "تاریخ تحویل بانک (ظرف ۱۰ روز)", type: "date", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-guild-fixed-tax-form",
    agency: "MOF-ARD",
    formName: "فورم تثبیت مالیه ثابت اصناف و کسبه‌کاران (طرزالعمل جدید)",
    formNamePs: "د اصنافو او کسبه کارانو د ثابت مالیې د تثبیت فورم",
    formNameEn: "Guilds & Small Taxpayers Fixed Tax Assessment Form",
    sourceUrl: "https://www.mof.gov.af/dr/%D8%B9%D9%88%D8%A7%DB%8C%D8%AF-%D9%85%D8%B3%D8%AA%D9%88%D9%81%DB%8C%D8%AA-%D9%81%D8%A7%D8%B1%DB%8C%D8%A7%D8%A8-%D8%B3%DB%8C-%D9%88-%D8%AF%D9%88-%D9%81%DB%8C%D8%B5%D8%AF-%D8%A7%D9%81%D8%B2%D8%A7%DB%8C%D8%B4-%DB%8C%D8%A7%D9%81%D8%AA%D9%87",
    originalFileUrl: "https://mof.gov.af/sites/default/files/2019-03/Guide%2019%20-%20Fixed%20Taxes%20on%20Commercial%20Activities(3)(1)-min.pdf",
    fields: [
      { key: "taxpayer_name", label: "نام مالیه‌دهنده (صاحب صنف)", type: "text", required: true, mapping: "customer.name" },
      { key: "father_name", label: "نام پدر", type: "text", mapping: "customer.fatherName" },
      { key: "tazkira", label: "نمبر تذکره", type: "text", mapping: "customer.nationalId" },
      { key: "tin", label: "TIN", type: "text", mapping: "customer.tin" },
      { key: "shop_address", label: "آدرس دکان / فعالیت", type: "textarea", mapping: "customer.address" },
      { key: "activity", label: "نوع صنف / فعالیت", type: "text", mapping: "customer.activity" },
      { key: "annual_sales", label: "فروش سالانه (افغانی)", type: "number", required: true },
      { key: "exempt_threshold", label: "سقف معافیت قانونی (۲,۰۰۰,۰۰۰ افغانی)", type: "number", required: true },
      { key: "taxable_excess", label: "مبلغ مازاد بر سقف معافیت", type: "number", required: true },
      { key: "rate", label: "نرخ مالیه (۰.۳٪)", type: "number", required: true },
      { key: "fixed_tax", label: "مالیه ثابت قابل تادیه", type: "number", required: true },
      { key: "penalty_amnesty", label: "معافیت جرایم مالیاتی (۱۰۰٪)", type: "select", options: ["تطبیق‌شده", "مطابق حکم جاری"], required: true },
      { key: "fiscal_year", label: "سال مالی", type: "text", required: true },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-tax-clearance-5docs",
    agency: "MOF-ARD",
    formName: "دوسیه تصفیه ابتدایی مالیات — ۵ سند حمایوی (ماده ۵۹ قانون اداره امور مالیات)",
    formNamePs: "د مالیې د ابتدايي تصفیې دوسیه — ۵ ملاتړ اسناد",
    formNameEn: "Tax Clearance Dossier (5 Supporting Documents Procedure)",
    sourceUrl: "https://ard.gov.af/497/497",
    fields: [
      { key: "taxpayer_name", label: "نام مالیه‌دهنده", type: "text", required: true, mapping: "customer.name" },
      { key: "tin", label: "TIN", type: "text", required: true, mapping: "customer.tin" },
      { key: "license_number", label: "شماره جواز", type: "text", mapping: "customer.licenseNumber" },
      { key: "doc_1_return", label: "۱. اظهارنامه مالیاتی و بیلانس شیت", type: "select", options: ["ضمیمه", "ناقص"], required: true },
      { key: "doc_2_license", label: "۲. کاپی جواز فعالیت", type: "select", options: ["ضمیمه", "ناقص"], required: true },
      { key: "doc_3_m16", label: "۳. فورم‌های م-۱۶", type: "select", options: ["ضمیمه", "ناقص"], required: true },
      { key: "doc_4_brt", label: "۴. فورم‌های ربع‌وار مالیه انتفاعی", type: "select", options: ["ضمیمه", "ناقص"], required: true },
      { key: "doc_5_wht", label: "۵. فورم‌های مالیات موضوعی (معاشات، کرایه، قراردادی)", type: "select", options: ["ضمیمه", "ناقص"], required: true },
      { key: "review_deadline", label: "مهلت تصفیه ابتدایی (۲۱ روز مطابق ماده ۵۹)", type: "text" },
      ...CASE_FIELDS,
      ...SIGNATURE_FIELDS,
    ],
  },
  {
    formKey: "mof-forms-index",
    agency: "MOF",
    formName: "فهرست فورمه‌جات وزارت مالیه (صفحه رسمی مرجع)",
    formNamePs: "د مالیې وزارت د فورمو فهرست",
    formNameEn: "Ministry of Finance Forms Index",
    sourceUrl: MOF_SOURCE,
    fields: [
      { key: "taxpayer_name", label: "نام مالیه‌دهنده", type: "text", required: true, mapping: "customer.name" },
      { key: "tin", label: "TIN", type: "text", mapping: "customer.tin" },
      { key: "form_required", label: "فورم مورد نیاز از فهرست رسمی", type: "text", required: true },
      { key: "notes", label: "یادداشت‌ها", type: "textarea" },
      ...CASE_FIELDS,
    ],
  },
];

/** Field labels for the three system languages. */
export function fieldLabel(f: OfficialFormField, lang: "fa" | "ps" | "en") {
  if (lang === "ps") return f.labelPs ?? f.label;
  if (lang === "en") return f.labelEn ?? f.label;
  return f.label;
}

export function formName(def: OfficialFormDefinition, lang: "fa" | "ps" | "en") {
  if (lang === "ps") return def.formNamePs ?? def.formName;
  if (lang === "en") return def.formNameEn ?? def.formName;
  return def.formName;
}

export const CATALOG_BY_KEY = new Map(OFFICIAL_FORMS_CATALOG.map((f) => [f.formKey, f]));
