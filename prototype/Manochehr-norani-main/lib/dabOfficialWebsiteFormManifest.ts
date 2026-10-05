/**
 * Current DAB website form manifest.
 *
 * This file records only forms that are currently listed on the official
 * DAB website pages checked on 2026-08-20. It is separate from internal
 * company documents and from workflow-specific application views.
 */

export type DabWebsiteFormGroup = 'exchange-and-money-services' | 'company';

export interface DabOfficialWebsiteForm {
  id: string;
  title: string;
  group: DabWebsiteFormGroup;
  sourceUrl: string;
  official: true;
}

const EXCHANGE_AND_MONEY_SERVICES_SOURCE =
  'https://dab.gov.af/dr/node/1930';
const COMPANY_SOURCE =
  'https://dab.gov.af/dr/%D9%81%D9%88%D8%B1%D9%85-%D9%87%D8%A7%DB%8C-%D8%B4%D8%B1%DA%A9%D8%AA-%D9%87%D8%A7%DB%8C-%D8%B5%D8%B1%D8%A7%D9%81%DB%8C-%D9%88-%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D9%BE%D9%88%D9%84%DB%8C';

export const DAB_OFFICIAL_WEBSITE_FORMS: readonly DabOfficialWebsiteForm[] = [
  {
    id: 'fx-responsible-employee',
    title: 'فورم معرفی کارمند مسئول (منشی) صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-responsible-employee',
    title: 'فورم معرفی کارمند مسئول (منشی) خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-guarantee',
    title: 'فورم ضمانت صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-guarantee',
    title: 'فورم ضمانت خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-name-change',
    title: 'فورم درخواستی تغیر نام صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-name-change',
    title: 'فورم درخواستی تغیر نام خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-agency-establishment',
    title: 'فورم ایجاد نمایندگی صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-agency-establishment',
    title: 'فورم ایجاد نمایندگی خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-closure',
    title: 'فورم درخواستی ترک پیشه صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-closure',
    title: 'فورم درخواستی ترک پیشه خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-license-application',
    title: 'فورم درخواستی ایجاد صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-license-application',
    title: 'فورم درخواستی ایجاد خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'ms-commitment',
    title: 'تعهد نامه عرضه کننده خدمات پولی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'fx-commitment',
    title: 'تعهد نامه صرافی',
    group: 'exchange-and-money-services',
    sourceUrl: EXCHANGE_AND_MONEY_SERVICES_SOURCE,
    official: true,
  },
  {
    id: 'company-commitment',
    title: 'تعهد نامه شرکت صرافی و خدمات پولی',
    group: 'company',
    sourceUrl: COMPANY_SOURCE,
    official: true,
  },
  {
    id: 'company-creation',
    title: 'فورم درخواستی ایجاد شرکت خدمات پولی و صرافی',
    group: 'company',
    sourceUrl: COMPANY_SOURCE,
    official: true,
  },
  {
    id: 'company-agency-establishment',
    title: 'فورم ایجاد نمایندگی شرکت صرافی و یا خدمات پولی',
    group: 'company',
    sourceUrl: COMPANY_SOURCE,
    official: true,
  },
  {
    id: 'company-license-suspension',
    title: 'فورم تعلیق جواز برای شرکت های صرافی و خدمات پولی',
    group: 'company',
    sourceUrl: COMPANY_SOURCE,
    official: true,
  },
  {
    id: 'company-ownership-transfer',
    title: 'فورم درخواستی انتقال مالکیت خدمات پولی',
    group: 'company',
    sourceUrl: COMPANY_SOURCE,
    official: true,
  },
];

export const DAB_OFFICIAL_WEBSITE_FORM_BY_ID = Object.fromEntries(
  DAB_OFFICIAL_WEBSITE_FORMS.map((form) => [form.id, form]),
) as Record<string, DabOfficialWebsiteForm>;
