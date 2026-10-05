/**
 * FINORA Operational Service Catalog
 * Exactly the 8 services shown on the public website, each with full operational
 * data (required documents, workflow steps, linked official forms) for the
 * management panel. Grouped into: جواز و خدمات اداری (4) and مالیات و حسابداری (4).
 */

export interface OperationalService {
  key: string;
  group: "licensing" | "tax";
  number: string; // 01..04 within group
  fa: string;
  ps: string;
  en: string;
  shortFa: string;
  shortPs: string;
  shortEn: string;
  descFa: string;
  descPs: string;
  descEn: string;
  requiredDocuments: { fa: string[]; ps: string[]; en: string[] };
  workflow: { fa: string[]; ps: string[]; en: string[] };
  forms: string[]; // official form keys
  defaultPrice: number;
  estimatedDays: number | null;
  order: number;
}

export const SERVICE_GROUP_LABELS = {
  licensing: { fa: "جواز و خدمات اداری", ps: "جواز او اداري خدمتونه", en: "Licensing & Administrative Services" },
  tax: { fa: "مالیات و حسابداری", ps: "مالیات او محاسبه", en: "Tax & Accounting" },
} as const;

export const OPERATIONAL_SERVICES: OperationalService[] = [
  /* ============ جواز و خدمات اداری ============ */
  {
    key: "fx-license",
    group: "licensing",
    number: "01",
    fa: "اخذ جواز صرافی",
    ps: "د صرافۍ جواز اخیستل",
    en: "FX Dealer License Acquisition",
    shortFa: "ترتیب اسناد و آماده‌سازی دوسیه",
    shortPs: "د اسنادو ترتیب او د دوسیې چمتوالی",
    shortEn: "Dossier preparation and document arrangement",
    descFa: "ترتیب کامل اسناد، خانه‌پری فورم‌های رسمی د افغانستان بانک و آماده‌سازی دوسیه درخواست جواز صرافی. تصمیم‌گیری و صدور نهایی جواز در صلاحیت د افغانستان بانک است.",
    descPs: "د بشپړو اسنادو ترتیب، د افغانستان بانک د رسمي فورمونو ډکول او د صرافۍ د جواز غوښتنې دوسیه چمتو کول. د جواز وروستۍ پرېکړه او صادرول د افغانستان بانک په واک کې دی.",
    descEn: "Complete document arrangement, filling of official Da Afghanistan Bank forms, and preparation of the FX dealer licence application dossier. Final licensing decisions rest with Da Afghanistan Bank.",
    requiredDocuments: {
      fa: ["فورم درخواستی ایجاد خدمات پولی (DAB)", "تعهدنامه عرضه‌کننده خدمات پولی", "فورم ضمانت خدمات پولی (۱ و ۲)", "کاپی تذکره یا پاسپورت متقاضی", "شماره تشخیصیه مالیه‌دهنده (TIN)", "عکس‌های پاسپورتی متقاضی", "اسناد مالکیت یا اجاره‌نامه دفتر", "سرمایه ثبت‌شده و اسناد بانکی", "وکالتنامه رسمی (در صورت نمایندگی)"],
      ps: ["د پولي خدمتونو د رامنځته کولو غوښتنلیک فورم (DAB)", "د پولي خدمتونو د وړاندې کوونکي تعهدنامه", "د پولي خدمتونو د تضمین فورم (۱ او ۲)", "د متقاضي د تذکرې یا پاسپورټ کاپي", "د مالیه ورکوونکي پېژندشمېره (TIN)", "د متقاضي پاسپورتي عکسونه", "د دفتر د ملکیت یا اجاره سند", "ثبت شوې پانګه او بانکي اسناد", "رسمي وکالتنامه (که استازیتوب وي)"],
      en: ["Application to Establish Money Services (DAB)", "Money Services Provider Undertaking", "Money Services Guarantee Forms 1 & 2", "Copy of applicant's Tazkira or passport", "Taxpayer Identification Number (TIN)", "Passport-size photographs", "Office ownership or lease documents", "Registered capital and bank evidence", "Notarised power of attorney (if applicable)"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["dab-msp-new", "dab-msp-commitment", "dab-msp-guarantee-1", "dab-msp-guarantee-2", "dab-msp-responsible-person"],
    defaultPrice: 0,
    estimatedDays: 21,
    order: 10,
  },
  {
    key: "fx-unfreeze",
    group: "licensing",
    number: "02",
    fa: "رفع تعلیق جواز",
    ps: "د جواز د تعلیق لېرې کول",
    en: "License Suspension Lifting",
    shortFa: "بررسی و تکمیل اسناد مورد نیاز",
    shortPs: "د اړینو اسنادو ارزونه او بشپړول",
    shortEn: "Review and completion of required documents",
    descFa: "بررسی دلایل تعلیق، تکمیل اسناد مورد نیاز و ترتیب درخواست رسمی رفع تعلیق مطابق رهنمودهای جاری د افغانستان بانک.",
    descPs: "د تعلیق د دلایلو ارزونه، د اړینو اسنادو بشپړول او د افغانستان بانک د اوسنیو لارښودونو سره سم د تعلیق د لېرې کولو رسمي غوښتنلیک ترتیب.",
    descEn: "Review suspension reasons, complete the required documents and prepare the official reinstatement request per current Da Afghanistan Bank guidance.",
    requiredDocuments: {
      fa: ["فورم درخواستی رفع تعلیق / مکاتبه رسمی", "کاپی جواز معلق‌شده", "ملاحظات و دلایل تعلیق (اړداف)", "پلان اصلاحی و تعهدنامه تعقیب", "اسناد تضمین به‌روز", "تسلیمی مالیاتی یا تصفیه حسابات", "معرفی کارمند مسئول (اگر تغییر کرده)"],
      ps: ["د تعلیف د لېرې کولو غوښتنلیک / رسمي مکتوب", "د تعلیق شوې جوازې کاپي", "د تعلیق ملاحظات او دلایل (نوټونه)", "د اصلاح پلان او د تعقیب تعهدنامه", "به‌روز تضمیني اسناد", "مالیاتي تسلیمی یا حساباتو تصفیه", "د مسوول کارمند معرفي (که بدل شوی وي)"],
      en: ["Suspension lifting request / official letter", "Copy of the suspended licence", "Findings and suspension reasons", "Corrective plan and compliance undertaking", "Updated guarantee documents", "Tax clearance or account settlement", "Responsible employee introduction (if changed)"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["dab-msp-commitment", "dab-msp-guarantee-1", "dab-msp-guarantee-2", "dab-fx-licensing-index"],
    defaultPrice: 0,
    estimatedDays: 14,
    order: 20,
  },
  {
    key: "fx-cancel",
    group: "licensing",
    number: "03",
    fa: "لغو جواز صرافی",
    ps: "د صرافۍ جواز لغوه کول",
    en: "FX Licence Cancellation",
    shortFa: "تنظیم درخواست و اسناد رسمی",
    shortPs: "د غوښتنلیک او رسمي اسنادو ترتیب",
    shortEn: "Application and official document preparation",
    descFa: "تنظیم درخواست ترک پیشه یا لغو جواز صرافی مطابق فورم رسمی د افغانستان بانک همراه اسناد تسویه‌حساب.",
    descPs: "د افغانستان بانک د رسمي فورم سره سم د صرافۍ د جواز د لغوه یا پرېښودلو غوښتنلیک ترتیب د تسویې حساب اسنادو سره.",
    descEn: "Prepare the FX licence surrender or cancellation request on the official Da Afghanistan Bank form, together with settlement documents.",
    requiredDocuments: {
      fa: ["فورم درخواستی ترک پیشه خدمات پولی", "اصل جواز فعالیت", "تصفیه حسابات مالیاتی", "اسناد تسویه با د افغانستان بانک", "کاپی تذکره متقاضی", "مکاتبه رسمی تعهدات باقی‌مانده"],
      ps: ["د پولي خدمتونو د ترک پیشې غوښتنلیک فورم", "د فعالیت اصلي جواز", "مالیاتي حساباتو تصفیه", "د افغانستان بانک سره د تسویې اسناد", "د متقاضي د تذکرې کاپي", "د پاتې تعهدونو رسمي مکتوب"],
      en: ["Money Services surrender application form", "Original activity licence", "Tax account clearance", "Settlement documents with DAB", "Copy of applicant's Tazkira", "Official letter on outstanding obligations"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["dab-msp-surrender", "dab-msp-commitment"],
    defaultPrice: 0,
    estimatedDays: 10,
    order: 30,
  },
  {
    key: "other-admin",
    group: "licensing",
    number: "04",
    fa: "سایر خدمات اداری",
    ps: "نور اداري خدمتونه",
    en: "Other Administrative Services",
    shortFa: "مکاتیب، درخواست‌ها و اسناد اداری",
    shortPs: "مکتوبونه، غوښتنلیکونه او اداري اسناد",
    shortEn: "Letters, requests and administrative documents",
    descFa: "ترتیب مکاتیب رسمی، درخواست‌ها، تصدیق‌نامه‌ها و اسناد اداری مورد نیاز هر دوسیه مطابق الزامات مراجع مربوطه.",
    descPs: "د هرې دوسیې د اړتیا له مخې رسمي مکتوبونه، غوښتنلیکونه، تصدیقلیکونه او اداري اسناد ترتیبول د اړوندو مراجعو د اړتیاوو سره سم.",
    descEn: "Prepare official letters, applications, certifications and administrative documents required for each case, per the requirements of the relevant authorities.",
    requiredDocuments: {
      fa: ["معلومات مشخص دوسیه و مشتری", "کاپی تذکره / جواز / TIN", "متن یا موضوع مورد نظر مشتری", "مرجع مقصد و آدرس آن"],
      ps: ["د دوسیې او مراجع ځانګړي معلومات", "د تذکرې / جواز / TIN کاپي", "د مراجع خوښه موضوع یا متن", "د مقصد مرجع او پته"],
      en: ["Specific case and client information", "Copy of Tazkira / licence / TIN", "Client's intended subject or text", "Target authority and address"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["mof-forms-index"],
    defaultPrice: 0,
    estimatedDays: null,
    order: 40,
  },

  {
    key: "license-renewal",
    group: "licensing",
    number: "05",
    fa: "تمدید جواز",
    ps: "د جواز تمدید",
    en: "Licence Renewal",
    shortFa: "بررسی وضعیت جواز، مالیات و تکمیل دوسیه تمدید",
    shortPs: "د جواز، مالیې او تمدید دوسیې ارزونه",
    shortEn: "Licence, tax and renewal dossier review",
    descFa: "مدیریت عملیاتی درخواست تمدید جواز از تشکیل دوسیه تا بررسی مالی، تکمیل اسناد و ثبت نتیجه.",
    descPs: "د جواز د تمدید غوښتنې عملیاتي مدیریت له دوسیې جوړولو څخه تر مالي ارزونې، اسنادو بشپړولو او پایلې ثبتولو.",
    descEn: "Operational management of licence renewal from case opening through financial review, document completion and final result.",
    requiredDocuments: {
      fa: ["اصل جواز فعالیت", "سند پرداخت فیس درخواست تمدید جواز", "رسید پرداخت مالیات یا تصدیق عدم باقی‌داری مالیاتی", "تصدیق عدم مسئولیت جنایی مالک و کارمندان رسمی", "عکس درخواست‌دهنده (۳ قطعه)"],
      ps: ["د فعالیت اصلي جواز", "د جواز د تمدید غوښتنې فیس د تادیې سند", "د مالیې د تادیې رسید یا د مالیاتی باقیدارۍ نه لرلو تصدیق", "د مالک او رسمي کارمندانو د جنایي مسئولیت نه لرلو تصدیق", "د غوښتونکي عکس (۳ قطعې)"],
      en: ["Original activity licence", "Licence renewal application fee payment receipt", "Tax payment receipt or tax clearance certificate", "Criminal clearance certificate for the owner and designated staff", "Applicant photographs (3 copies)"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: [],
    defaultPrice: 0,
    estimatedDays: 14,
    order: 50,
  },
  {
    key: "corrective-plan",
    group: "licensing",
    number: "06",
    fa: "ترتیب پلان اصلاحی",
    ps: "د اصلاحي پلان ترتیب",
    en: "Corrective Action Plan",
    shortFa: "مدیریت مراحل تعهد، مبلغ، موعد و پرداخت",
    shortPs: "د تعهد، مبلغ، نېټې او تادیې پړاوونو مدیریت",
    shortEn: "Management of obligations, amounts, due dates and payments",
    descFa: "ایجاد و پیگیری پلان اصلاحی مرحله‌ای با تعهد مشخص، مبلغ، موعد، پرداخت و تأیید هر مرحله.",
    descPs: "د مشخص تعهد، مبلغ، نېټې، تادیې او هر پړاو تایید سره د اصلاحي پلان جوړول او تعقیبول.",
    descEn: "Create and track a staged corrective plan with defined obligations, amounts, due dates, payments and approvals.",
    requiredDocuments: {
      fa: ["شرح مشکل یا تعهد", "اسناد مربوط به تعهد", "معلومات مبلغ و موعد هر مرحله", "اسناد پرداخت یا اجرای مرحله"],
      ps: ["د ستونزې یا تعهد تشریح", "د تعهد اړوند اسناد", "د هر پړاو مبلغ او نېټه", "د تادیې یا اجرا اسناد"],
      en: ["Issue or obligation description", "Supporting obligation documents", "Amount and due date for each stage", "Payment or completion evidence"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: [],
    defaultPrice: 0,
    estimatedDays: 30,
    order: 60,
  },

  /* ============ مالیات و حسابداری ============ */
  {
    key: "tax-settlement",
    group: "tax",
    number: "01",
    fa: "تصفیه مالیه",
    ps: "د مالیې تصفیه",
    en: "Tax Settlement",
    shortFa: "بررسی و ترتیب اسناد تصفیه مالیاتی",
    shortPs: "د مالیاتي تصفیې اسنادو ارزونه او ترتیب",
    shortEn: "Review and preparation of tax settlement documents",
    descFa: "بررسی و ترتیب ۵ سند حمایوی تصفیه مالیاتی (اظهارنامه و بیلانس شیت، کاپی جواز، فورم م-۱۶، فورم ربع‌وار انتفاعی، فورم‌های مالیات موضوعی) مطابق ماده ۵۹ قانون اداره امور مالیات و محاسبه مالیه با موتور قواعد وزارت مالیه.",
    descPs: "د مالیې د تصفیې ۵ ملاتړ اسناد ارزونه او ترتیب (اظهارنامه او بیلانس شیټ، د جواز کاپي، م-۱۶ فورم، ربعوار انتفاعي فورم، د موضوعي مالیې فورمونه) د مالیې د ادارې د قانون ۵۹ مادې سره سم او د مالیې وزارت د قواعدو موټر سره محاسبه.",
    descEn: "Review and prepare the 5 supporting tax settlement documents (return & balance sheet, licence copy, M-16 forms, quarterly BRT forms, withholding tax forms) per Article 59 of the Tax Administration Law, with calculation through the Ministry of Finance rules engine.",
    requiredDocuments: {
      fa: ["۱. اظهارنامه مالیاتی و بیلانس شیت", "۲. کاپی جواز فعالیت", "۳. فورم‌های م-۱۶", "۴. فورم‌های ربع‌وار مالیه انتفاعی", "۵. فورم‌های مالیات موضوعی (معاشات، کرایه، قراردادی)", "معلومات عواید و مصارف دوره", "شماره تشخیصیه مالیه‌دهنده (TIN)"],
      ps: ["۱. مالیاتي اظهارنامه او بیلانس شیټ", "۲. د فعالیت د جواز کاپي", "۳. م-۱۶ فورمونه", "۴. د انتفاعي مالیې ربعوار فورمونه", "۵. د موضوعي مالیې فورمونه (معاشات، کرایه، قراردادي)", "د دورې عوایدو او مصارفو معلومات", "د مالیه ورکوونکي پېژندشمېره (TIN)"],
      en: ["1. Tax return and balance sheet", "2. Copy of activity licence", "3. M-16 forms", "4. Quarterly BRT forms", "5. Withholding tax forms (wages, rent, contractor)", "Period income and expense data", "Taxpayer Identification Number (TIN)"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["mof-tax-clearance-5docs", "mof-annual-cit-return", "mof-quarterly-brt-return", "mof-contractor-wht-m16", "mof-wage-wht-form", "mof-rent-wht-form"],
    defaultPrice: 0,
    estimatedDays: 21,
    order: 10,
  },
  {
    key: "tax-advisory",
    group: "tax",
    number: "02",
    fa: "مشاوره مالیاتی",
    ps: "مالیاتي مشوره",
    en: "Tax Advisory",
    shortFa: "بررسی موضوع و مسیر قانونی دوسیه",
    shortPs: "د موضوع او قانوني لارې ارزونه",
    shortEn: "Subject and legal pathway review",
    descFa: "بررسی موضوع مالیاتی مشتری، تشریح مسیر قانونی و الزامات مراجع مربوطه با ارجاع به منابع رسمی وزارت مالیه و ریاست عمومی عواید.",
    descPs: "د مراجع مالیاتي موضوع ارزونه، قانوني لار او د اړوندو مراجعو اړتیاوې تشریح د مالیې وزارت او عوایدو ریاست رسمي سرچینو ته اشاره سره.",
    descEn: "Review the client's tax matter, explain the legal pathway and authority requirements with references to official Ministry of Finance and Revenue Directorate sources.",
    requiredDocuments: {
      fa: ["معلومات موضوع مالیاتی", "اسناد مربوطه (اظهارنامه، مکاتبات)", "شماره تشخیصیه مالیه‌دهنده (TIN)", "ارزیابی یا ملاحظات مرجع (در صورت وجود)"],
      ps: ["د مالیاتي موضوع معلومات", "اړوند اسناد (اظهارنامه، مکتوبونه)", "د مالیه ورکوونکي پېژندشمېره (TIN)", "د مرجع ارزونه یا ملاحظات (که موجود وي)"],
      en: ["Description of the tax matter", "Relevant documents (returns, correspondence)", "Taxpayer Identification Number (TIN)", "Authority assessment or findings (if any)"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["mof-tin-application", "mof-forms-index"],
    defaultPrice: 0,
    estimatedDays: null,
    order: 20,
  },
  {
    key: "finance-advisory",
    group: "tax",
    number: "03",
    fa: "مشاوره مالی",
    ps: "مالي مشوره",
    en: "Financial Advisory",
    shortFa: "بررسی معلومات و نیازهای مالی",
    shortPs: "د معلوماتو او مالي اړتیاو ارزونه",
    shortEn: "Financial data and needs assessment",
    descFa: "بررسی معلومات مالی مشتری، ارزیابی نیازها و ارائه توصیه در تنظیم اسناد، ثبت عواید و مصارف و گزارش‌دهی داخلی.",
    descPs: "د مراجع مالي معلومات ارزونه، د اړتیاو سنجونه او په اسنادو تنظیم، عوایدو او مصارفو ثبت او داخلي راپور ورکولو کې مشوره ورکول.",
    descEn: "Review the client's financial information, assess needs and advise on document organisation, income and expense recording, and internal reporting.",
    requiredDocuments: {
      fa: ["معلومات عواید و مصارف جاری", "اسناد حسابداری موجود", "معلومات حساب‌های بانکی و صندوق", "اهداف و نیازهای مالی مشتری"],
      ps: ["د اوسنیو عوایدو او مصارفو معلومات", "موجوده محاسبي اسناد", "د بانکي او صندوق حسابونو معلومات", "د مراجع موخې او مالي اړتیاوې"],
      en: ["Current income and expense data", "Existing accounting records", "Bank and cash account information", "Client's objectives and financial needs"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: [],
    defaultPrice: 0,
    estimatedDays: null,
    order: 30,
  },
  {
    key: "financial-report",
    group: "tax",
    number: "04",
    fa: "تهیه گزارش مالی",
    ps: "مالي راپور جوړول",
    en: "Financial Reporting",
    shortFa: "تنظیم گزارش مالی بر اساس اسناد",
    shortPs: "د اسنادو پر بنسټ مالي راپور ترتیب",
    shortEn: "Financial report preparation based on documents",
    descFa: "تهیه گزارش‌های مالی داخلی (عواید، مصارف، مفاد و زیان، بیلانس شیت) از اسناد و معلومات تأییدشده مشتری با قابلیت چاپ و خروجی CSV/Excel.",
    descPs: "د مراجع د تایید شوو اسنادو او معلوماتو څخه داخلي مالي راپورونه (عواید، مصارف، ګټه او زیان، بیلانس شیټ) جوړول د چاپ او CSV/Excel صادرولو وړ.",
    descEn: "Prepare internal financial reports (income, expenses, profit & loss, balance sheet) from client-verified documents, with print and CSV/Excel export.",
    requiredDocuments: {
      fa: ["اسناد عواید و مصارف دوره", "صورت‌حساب بانکی و صندوق", "معلومات دارایی‌ها و بدهی‌ها", "دوره گزارش و واحد اسعار"],
      ps: ["د دورې عوایدو او مصارفو اسناد", "بانکي او صندوق صورت حساب", "د شتمنیو او پورونو معلومات", "د راپور موده او د اسعارو واحد"],
      en: ["Period income and expense documents", "Bank and cash statements", "Asset and liability information", "Reporting period and currency"],
    },
    workflow: {
      fa: ["ثبت درخواست", "تکمیل اسناد", "اجرا و پرداخت", "تحویل"],
      ps: ["د غوښتنې ثبت", "د اسنادو بشپړول", "اجرا او تادیه", "سپارل"],
      en: ["Request intake", "Document completion", "Execution & payment", "Delivery"],
    },
    forms: ["mof-annual-cit-return", "mof-quarterly-brt-return"],
    defaultPrice: 0,
    estimatedDays: 7,
    order: 40,
  },
];

export const SERVICES_BY_GROUP = {
  licensing: OPERATIONAL_SERVICES.filter((s) => s.group === "licensing"),
  tax: OPERATIONAL_SERVICES.filter((s) => s.group === "tax"),
};

/** Find the operational service definition linked to a seeded DB service row by name. */
export function matchOperationalService(name: string, category: string | null) {
  return OPERATIONAL_SERVICES.find((s) => s.fa === name || s.en === name || (category && s.group === category && s.fa.includes(name.slice(0, 6))));
}

export function serviceLabel(s: OperationalService, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? s.ps : lang === "en" ? s.en : s.fa;
}
export function serviceShort(s: OperationalService, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? s.shortPs : lang === "en" ? s.shortEn : s.shortFa;
}
export function serviceDesc(s: OperationalService, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? s.descPs : lang === "en" ? s.descEn : s.descFa;
}
export function serviceDocs(s: OperationalService, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? s.requiredDocuments.ps : lang === "en" ? s.requiredDocuments.en : s.requiredDocuments.fa;
}
export function serviceSteps(s: OperationalService, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? s.workflow.ps : lang === "en" ? s.workflow.en : s.workflow.fa;
}
export function groupLabel(g: "licensing" | "tax", lang: "fa" | "ps" | "en") {
  const l = SERVICE_GROUP_LABELS[g];
  return lang === "ps" ? l.ps : lang === "en" ? l.en : l.fa;
}
