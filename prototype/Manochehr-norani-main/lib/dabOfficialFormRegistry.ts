/**
 * Official DAB source registry for exchange and money-service licensing forms.
 *
 * Sources are DAB pages. The app is a digital data-entry workspace and does not
 * claim that its generated printout is the official DAB paper form.
 */

export type DabOfficialFormCategory =
  | 'licensing'
  | 'company'
  | 'representative'
  | 'renewal'
  | 'compliance'
  | 'change'
  | 'suspension'
  | 'closure'
  | 'commencement'
  | 'exchange'
  | 'money-services'
  | 'supporting-documents';

export type DabOfficialFormSourceGroup =
  | 'company-licensing'
  | 'exchange'
  | 'money-services';

export interface DabOfficialFormDefinition {
  id: string;
  title: string;
  category: DabOfficialFormCategory;
  sourceGroup: DabOfficialFormSourceGroup;
  sourceTitle: string;
  sourceUrl: string;
  official: true;
  printNotice: string;
}

const COMPANY_SOURCE_URL = 'https://www.dab.gov.af/dr/node/1949';
const EXCHANGE_SOURCE_URL = 'https://dab.gov.af/dr/node/1930';
const MONEY_SERVICES_SOURCE_URL = 'https://dab.gov.af/dr/%D9%81%D9%88%D8%B1%D9%85-%D9%87%D8%A7%DB%8C-%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D9%BE%D9%88%D9%84%DB%8C';

const make = (
  id: string,
  title: string,
  category: DabOfficialFormCategory,
  sourceGroup: DabOfficialFormSourceGroup,
  sourceTitle: string,
  sourceUrl: string,
): DabOfficialFormDefinition => ({
  id,
  title,
  category,
  sourceGroup,
  sourceTitle,
  sourceUrl,
  official: true,
  printNotice:
    'این نسخه دیجیتال برای ثبت و مدیریت معلومات است. نسخه چاپی رسمی باید با آخرین فایل منتشرشده د افغانستان بانک تطبیق نهایی شود.',
});

const companyForms: DabOfficialFormDefinition[] = [
  make('license-application', 'فورم درخواستی جواز فعالیت شرکت صرافی و خدمات پولی', 'licensing', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('shareholder-employee-profile', 'شهرت سهمدار / کارمند شرکت صرافی و خدمات پولی', 'company', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('articles', 'اساسنامه شرکت صرافی و خدمات پولی', 'company', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-establishment', 'فورم ایجاد نمایندگی و معرفی نماینده با صلاحیت برای نمایندگی شرکت صرافی و خدمات پولی', 'representative', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-renewal', 'فورم تمدید نمایندگی شرکت صرافی و خدمات پولی', 'renewal', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('shareholder-guarantee', 'فورم تضمین سر سهمدار / سهمداران شرکت صرافی و خدمات پولی', 'compliance', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('guarantee-letter', 'فورم ضمانت خط شرکت صرافی و خدمات پولی', 'compliance', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('license-renewal', 'فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی', 'renewal', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('aml-cft-policy', 'پالیسی مبارزه با پولشویی و تمویل تروریزم', 'compliance', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-closure-permit', 'فورم درخواستی ترک پیشه اجازه نامه نمایندگی شرکت صرافی و خدمات پولی', 'closure', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-change', 'فورم تغییرات نمایندگی شرکت های صرافی و خدمات پولی', 'change', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('ownership-transfer', 'فورم درخواستی انتقال مالکیت شرکت صرافی و خدمات پولی', 'change', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('name-change', 'فورم درخواستی تغییر نام شرکت صرافی و خدمات پولی', 'change', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('location-change', 'فورم درخواستی تغییر موقعیت شرکت صرافی و خدمات پولی', 'change', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('license-suspension', 'فورم درخواستی تعلیق جواز شرکت صرافی و خدمات پولی', 'suspension', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-suspension', 'فورم درخواستی تعلیق اجازه نامه نمایندگی شرکت صرافی و خدمات پولی', 'suspension', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('license-closure', 'فورم درخواستی ترک پیشه جواز فعالیت شرکت صرافی و خدمات پولی', 'closure', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('agency-closure', 'فورم درخواستی ترک پیشه اجازه نامه نمایندگی شرکت صرافی و خدمات پولی', 'closure', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('commencement-letter', 'مکتوب آغاز فعالیت', 'commencement', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('organization-chart', 'تشکیلاتی چارت', 'supporting-documents', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('employee-signature-samples', 'نمونه امضای کارکنان شرکت', 'supporting-documents', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('hr-policy', 'پالیسی منابع بشری', 'supporting-documents', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('employee-introduction-letter', 'مکتوب معرفی کارکنان', 'supporting-documents', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
  make('company-commitment', 'تعهد نامه شرکت صرافی و خدمات پولی', 'compliance', 'company-licensing', 'دستورالعمل ها و فورمه های جوازدهی — د افغانستان بانک', COMPANY_SOURCE_URL),
];

const exchangeForms: DabOfficialFormDefinition[] = [
  make('fx-responsible-employee', 'فورم معرفی کارمند مسئول (منشی) صرافی', 'exchange', 'exchange', 'صرافان — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-guarantee', 'فورم ضمانت صرافی ۱', 'exchange', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-guarantee-2', 'فورم ضمانت صرافی ۲', 'exchange', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-name-change', 'فورم درخواستی تغییر نام صرافی', 'change', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-agency-establishment', 'فورم ایجاد نمایندگی صرافی', 'representative', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-closure', 'فورم درخواستی ترک پیشه صرافی', 'closure', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-license-application', 'فورم درخواستی ایجاد صرافی', 'exchange', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-license-renewal', 'فورم درخواستی تمدید جواز صرافی', 'renewal', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-ownership-transfer', 'فورم درخواستی انتقال مالکیت صرافی', 'change', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-license-suspension', 'فورم درخواستی تعلیق جواز صرافی', 'suspension', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
  make('fx-commitment', 'تعهد نامه صرافی', 'compliance', 'exchange', 'فورم های صرافی — د افغانستان بانک', EXCHANGE_SOURCE_URL),
];

const moneyServiceForms: DabOfficialFormDefinition[] = [
  make('ms-responsible-employee', 'فورم معرفی کارمند مسئول (منشی) خدمات پولی', 'money-services', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-guarantee-1', 'فورم ضمانت خدمات پولی ۱', 'money-services', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-guarantee-2', 'فورم ضمانت خدمات پولی ۲', 'money-services', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-name-change', 'فورم درخواستی تغییر نام خدمات پولی', 'change', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-agency-establishment', 'فورم ایجاد نمایندگی خدمات پولی', 'representative', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-closure', 'فورم درخواستی ترک پیشه خدمات پولی', 'closure', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-license-application', 'فورم درخواستی ایجاد خدمات پولی', 'money-services', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-license-renewal', 'فورم درخواستی تمدید جواز خدمات پولی', 'renewal', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-ownership-transfer', 'فورم درخواستی انتقال مالکیت خدمات پولی', 'change', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-license-suspension', 'فورم درخواستی تعلیق جواز خدمات پولی', 'suspension', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-guarantee', 'فورم ضمانت خدمات پولی', 'money-services', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
  make('ms-commitment', 'تعهد نامه عرضه کننده خدمات پولی', 'compliance', 'money-services', 'فورم های خدمات پولی — د افغانستان بانک', MONEY_SERVICES_SOURCE_URL),
];

export const DAB_OFFICIAL_FORMS: DabOfficialFormDefinition[] = [
  ...companyForms,
  ...exchangeForms,
  ...moneyServiceForms,
];

export const DAB_OFFICIAL_FORM_BY_ID = Object.fromEntries(
  DAB_OFFICIAL_FORMS.map((form) => [form.id, form]),
) as Record<string, DabOfficialFormDefinition>;

export const DAB_RENEWAL_FORM_ID = 'license-renewal';

export const DAB_RENEWAL_REQUIRED_DOCUMENTS = [
  { key: 'originalLicense', title: 'اصل جواز فعالیت', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۱' },
  { key: 'renewalFeeReceipt', title: 'سند پرداخت فیس درخواست تمدید جواز', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۲' },
  { key: 'taxPaymentOrClearance', title: 'رسید پرداخت مالیات یا تصدیق عدم باقی‌داری مالیاتی', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۳' },
  { key: 'criminalClearance', title: 'تصدیق عدم مسئولیت جنایی مالک و کارمندان رسمی مشمول', required: true, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۴' },
  { key: 'applicantPhotos', title: 'عکس درخواست‌دهنده', required: true, quantity: 3, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۵' },
  { key: 'updatedInitialApplicationInformation', title: 'معلومات و مدارک به‌روزشده درخواست اولیه در صورت تغییرات عمده', required: false, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۶' },
  { key: 'otherDabRequestedInformation', title: 'سایر معلومات مورد مطالبه د افغانستان بانک', required: false, legalBasis: 'ماده ۱۵، فقره (۱)، جزء ۷' },
] as const;
