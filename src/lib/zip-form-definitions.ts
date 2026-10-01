import type { OfficialFormField } from "./forms-catalog";

export type ZipFormDefinition = {
  fields: OfficialFormField[];
  requiredAttachments: string[];
  sections: { title: string; fields: string[] }[];
};

const base = (key: string, label: string, mapping?: string, required = false): OfficialFormField => ({
  key, label, type: "text", mapping, required,
});

export const ZIP_FORM_DEFINITIONS: Record<string, ZipFormDefinition> = {
  "dab-msp-renewal": {
    fields: [
      base("company_name", "نام شرکت", "customer.name", true),
      base("company_name_en", "نام شرکت به انگلیسی", "customer.englishName"),
      base("license_number", "شماره جواز", "customer.primaryLicense.licenseNumber", true),
      { key: "license_issue_date", label: "تاریخ صدور جواز", type: "date", mapping: "customer.primaryLicense.issueDate", required: true },
      { key: "license_expiry", label: "تاریخ ختم جواز", type: "date", mapping: "customer.primaryLicense.expiryDate", required: true },
      base("tin", "شماره تشخیصیه مالیه‌دهنده (TIN)", "customer.tin", true),
      base("phone", "شماره تماس", "customer.phone", true),
      base("email", "ایمیل آدرس", "customer.email"),
      base("province", "ولایت", "customer.province", true),
      base("district", "ولسوالی", "customer.district", true),
      base("area", "ناحیه", "customer.area"),
      base("address", "آدرس شرکت", "customer.address", true),
      { key: "shareholders_count", label: "تعداد سهمداران", type: "number", mapping: "customer.shareholdersCount", required: true },
      { key: "branches_count", label: "تعداد نمایندگی‌ها", type: "number", mapping: "customer.branchesCount" },
      { key: "employees_count", label: "تعداد کارمندان", type: "number", mapping: "customer.employeesCount" },
      { key: "bank_accounts_count", label: "تعداد حساب‌های بانکی", type: "number", mapping: "customer.bankAccountsCount", required: true },
      { key: "change_requested", label: "آیا تغییر عمده مطالبه شده است؟", type: "select", options: ["بلی", "نخیر"] },
      { key: "change_description", label: "شرح تغییرات مطالبه‌شده", type: "textarea" },
      { key: "active_since_last_year", label: "شرکت از سال گذشته تا اکنون فعال بوده است؟", type: "select", options: ["بلی", "نخیر"] },
      { key: "activity_inactivity_reason", label: "دلیل عدم فعالیت", type: "textarea" },
      { key: "litigation_declared", label: "دعوی علیه سهمدار/شرکت وجود داشته است؟", type: "select", options: ["بلی", "نخیر"] },
      { key: "litigation_description", label: "شرح دعوی", type: "textarea" },
      { key: "tax_clearance_status", label: "وضعیت رفع مسئولیت مالیاتی", type: "select", options: ["ارائه شده", "در حال پیگیری", "مفقود"] , required: true },
      { key: "guarantee_status", label: "وضعیت تضمین", type: "select", options: ["کامل", "ناقص", "در حال تمدید"], required: true },
      { key: "guarantee_amount", label: "مبلغ تضمین پولی", type: "number", mapping: "customer.primaryLicense.guaranteeAmount" },
      { key: "shareholders_summary", label: "خلاصه سهمداران", type: "textarea", mapping: "customer.shareholdersSummary", required: true },
      { key: "branches_summary", label: "خلاصه نمایندگی‌ها", type: "textarea", mapping: "customer.branchesSummary" },
      { key: "bank_accounts_summary", label: "خلاصه حساب‌های بانکی", type: "textarea", mapping: "customer.bankAccountsSummary", required: true },
      { key: "signature_name", label: "نام سهمدار/امضاکننده", type: "text", required: true },
      { key: "signature_date", label: "تاریخ امضاء", type: "date", required: true },
    ],
    requiredAttachments: [
      "اصل جواز فعالیت",
      "فورم تمدید جواز",
      "اساسنامه",
      "چارت ساختار تشکیلاتی",
      "رسید آویز تضمین",
      "فورم تضمین سر سهمدار/سهمداران",
      "مکتوب عدم مسئولیت مالیاتی",
      "پالیسی مبارزه علیه تطهیر پول و تمویل تروریزم",
      "قرارداد سیستم نرم‌افزار",
      "اسناد/استعلام‌های کارمندان و نمایندگان",
    ],
    sections: [
      { title: "بخش اول: مشخصات سهمداران", fields: ["shareholders_summary"] },
      { title: "بخش دوم: مشخصات جواز و شرکت", fields: ["company_name","company_name_en","license_number","license_issue_date","license_expiry","tin","phone","email","province","district","area","address","branches_summary","bank_accounts_summary"] },
      { title: "بخش سوم: تغییرات و اظهارات", fields: ["change_requested","change_description","active_since_last_year","activity_inactivity_reason","litigation_declared","litigation_description"] },
      { title: "بخش چهارم: شصت و امضاء", fields: ["signature_name","signature_date"] },
    ],
  },
  "dab-msp-branch": {
    fields: [
      base("company_name", "نام شرکت", "customer.name", true),
      base("license_number", "شماره جواز", "customer.primaryLicense.licenseNumber", true),
      base("office_address", "موقعیت دفتر مرکزی", "customer.address", true),
      base("branch_name", "نام نمایندگی", "customer.selectedBranch.name"),
      base("branch_number", "شماره نمایندگی طبق جواز", "customer.selectedBranch.branchNumber", true),
      base("branch_province", "ولایت نمایندگی", "customer.selectedBranch.province", true),
      base("branch_district", "ولسوالی/ناحیه", "customer.selectedBranch.district"),
      base("branch_area", "ناحیه", "customer.selectedBranch.area"),
      base("branch_market", "مارکیت", "customer.selectedBranch.market"),
      base("branch_shop", "منزل و شماره دکان", "customer.selectedBranch.shopNumber"),
      base("representative_name", "اسم نماینده با صلاحیت", "customer.selectedBranch.representative.fullName", true),
      base("representative_father", "نام پدر نماینده", "customer.selectedBranch.representative.fatherName", true),
      base("representative_tazkira", "نمبر تذکره نماینده", "customer.selectedBranch.representative.nationalId", true),
      base("representative_phone", "شماره تماس نماینده", "customer.selectedBranch.representative.phone"),
      base("representative_education", "سطح تحصیلات نماینده", "customer.selectedBranch.representative.educationLevel", true),
      base("representative_education_field", "رشته تحصیلی", "customer.selectedBranch.representative.educationField"),
      { key: "board_approval", label: "تصویب هیئت نظار ضمیمه شده است؟", type: "select", options: ["بلی","نخیر"], required: true },
      { key: "signature_date", label: "تاریخ امضاء", type: "date", required: true },
    ],
    requiredAttachments: [
      "اصل جواز نمایندگی",
      "فورم تمدید نمایندگی",
      "درخواست همراه با تصویب هیئت نظار",
      "صورت حساب بانکی سرمایه کاری",
      "تضمین تحویلی",
      "پاسخ استعلام محل فعالیت",
      "پاسخ عدم مسئولیت مالیاتی",
      "کاپی تذکره و سند تحصیلی نماینده",
    ],
    sections: [
      { title: "بخش اول: مشخصات شرکت", fields: ["company_name","license_number","office_address"] },
      { title: "بخش دوم: مشخصات نمایندگی و نماینده", fields: ["branch_name","branch_number","branch_province","branch_district","branch_area","branch_market","branch_shop","representative_name","representative_father","representative_tazkira","representative_phone","representative_education","representative_education_field"] },
      { title: "بخش سوم: تصدیق و امضاء", fields: ["board_approval","signature_date"] },
    ],
  },
  "dab-msp-guarantee-2": {
    fields: [
      base("company_name", "نام شرکت", "customer.name", true),
      base("license_number", "شماره جواز", "customer.primaryLicense.licenseNumber", true),
      { key: "shareholders_summary", label: "فهرست سهمداران و فیصدی سهم", type: "textarea", mapping: "customer.shareholdersSummary", required: true },
      { key: "guarantors_summary", label: "فهرست تضمین‌کنندگان", type: "textarea", mapping: "customer.guarantorsSummary", required: true },
      { key: "guarantee_validity", label: "مدت اعتبار ضمانت", type: "text", required: true },
      { key: "signature_date", label: "تاریخ ضمانت", type: "date", required: true },
    ],
    requiredAttachments: ["فورم ضمانت سر سهمدار/سهمداران","کاپی تذکره ضامن","کاپی جواز معتبر ضامن","عکس ضامن","اسناد شرکت تضمین‌کننده در صورت مطالبه"],
    sections: [
      { title: "بخش اول: شهرت تضمین‌کنندگان", fields: ["guarantors_summary"] },
      { title: "بخش دوم: شهرت سهمدار/سهمداران تضمین‌شونده", fields: ["shareholders_summary"] },
      { title: "بخش سوم: تعهدات و امضاء", fields: ["guarantee_validity","signature_date"] },
    ],
  },
  "dab-msp-responsible-person": {
    fields: [
      base("company_name", "نام شرکت", "customer.name", true),
      base("license_number", "شماره جواز", "customer.primaryLicense.licenseNumber"),
      base("employee_name", "نام کارمند مسئول", "customer.selectedEmployee.fullName", true),
      base("employee_father", "نام پدر کارمند", "customer.selectedEmployee.fatherName", true),
      base("employee_tazkira", "نمبر تذکره", "customer.selectedEmployee.nationalId", true),
      base("employee_phone", "شماره تماس", "customer.selectedEmployee.phone"),
      base("employee_position", "موقف/وظیفه", "customer.selectedEmployee.position", true),
      base("employee_education", "درجه تحصیل", "customer.selectedEmployee.educationLevel"),
      base("employee_field", "رشته تحصیل", "customer.selectedEmployee.educationField"),
      base("employee_tin", "نمبر تشخیصیه", "customer.selectedEmployee.tin"),
      base("employee_email", "ایمیل", "customer.selectedEmployee.email"),
      { key: "signature_date", label: "تاریخ معرفی", type: "date", required: true },
    ],
    requiredAttachments: ["فورم معلومات کارمند","کاپی تذکره","اسناد تحصیلی در صورت مطالبه","عکس کارمند"],
    sections: [{ title: "مشخصات کارمند مسئول", fields: ["company_name","license_number","employee_name","employee_father","employee_tazkira","employee_phone","employee_position","employee_education","employee_field","employee_tin","employee_email","signature_date"] }],
  },
};

export function getZipFormDefinition(formKey: string) {
  return ZIP_FORM_DEFINITIONS[formKey] ?? null;
}

export function mergeZipFields(formKey: string, existing: OfficialFormField[]) {
  const def = getZipFormDefinition(formKey);
  if (!def) return existing;
  const byKey = new Map(existing.map((f) => [f.key, f]));
  for (const field of def.fields) byKey.set(field.key, { ...(byKey.get(field.key) ?? {}), ...field });
  return [...byKey.values()];
}
