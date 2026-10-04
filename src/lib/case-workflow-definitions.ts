import { OPERATIONAL_SERVICES } from "./operational-services";

/** Internal service keys; public marketing and official authority decisions remain separate. */
export const WORKFLOW_KEYS = ["tax-settlement", "license-renewal", "fx-license", "fx-cancel", "fx-unfreeze", "corrective-plan", "other-admin", "tax-advisory", "finance-advisory", "financial-report"] as const;
export type WorkflowKey = (typeof WORKFLOW_KEYS)[number];
export const isWorkflowKey = (v: string): v is WorkflowKey => WORKFLOW_KEYS.includes(v as WorkflowKey);
export type Language = "fa" | "ps" | "en";

const existing = (key: string) => OPERATIONAL_SERVICES.find((s) => s.key === key);
const docs = (key: string) => existing(key)?.requiredDocuments ?? { fa: [], ps: [], en: [] };

export const WORKFLOW_SERVICES: Record<WorkflowKey, {
  label: Record<Language, string>;
  summary: Record<Language, string>;
  requirements: Record<Language, string[]>;
  stages: readonly string[];
  publicListed: boolean;
}> = {
  "tax-settlement": {
    label: { fa: "تصفیه مالیاتی مشتری", ps: "د پیرودونکي مالیاتي تصفیه", en: "Client tax settlement" },
    summary: { fa: "بررسی مالیه و اسناد، محاسبه با قاعدهٔ معتبر، ثبت رسید رسمی و بستن دوسیه پس از تأیید.", ps: "د مالیې او اسنادو ارزونه، د باوري قاعدې پر بنسټ محاسبه، د رسمي رسید ثبت او له تایید وروسته د دوسیې تړل.", en: "Review tax and evidence, calculate under a validated rule, record authority receipts, and close after approval." },
    requirements: docs("tax-settlement"),
    stages: ["intake", "documents", "execution", "delivery"], publicListed: true,
  },
  "license-renewal": {
    label: { fa: "تمدید جواز صرافی", ps: "د صرافۍ جواز تمدید", en: "FX licence renewal" },
    summary: { fa: "بررسی جواز موجود و تاریخ ختم، بدهی مشتری، تصفیه، فیس، تسلیمی و نتیجهٔ مرجع.", ps: "د موجود جواز او پای نېټې، د مراجع پور، تصفیه، فیس، سپارلو او د مرجع پایلې ارزونه.", en: "Review existing licence and expiry, client liabilities, settlement, fees, submission and authority outcome." },
    requirements: { fa: ["کاپی جواز فعلی و تاریخ ختم", "تذکره متقاضی و TIN", "اسناد مالیاتی و تصفیهٔ قابل تطبیق", "فورم تمدید جواز از منبع رسمی مرجع", "رسید فیس مرجع در صورت مطالبه"], ps: ["د اوسني جواز کاپي او د پای نېټه", "د متقاضي تذکره او TIN", "مالیاتي اسناد او اړونده تصفیه", "د مرجع له رسمي سرچینې د جواز تمدید فورم", "د مرجع د فیس رسید که غوښتل کېږي"], en: ["Current licence and expiry", "Applicant ID and TIN", "Applicable tax and clearance evidence", "Renewal form from authority source", "Authority fee receipt where required"] },
    stages: ["intake", "documents", "execution", "delivery"], publicListed: false,
  },
  "other-admin": { label: { fa: "سایر خدمات اداری", ps: "نور اداري خدمتونه", en: "Other administrative services" }, summary: { fa: "ثبت موضوع، تهیه سند یا مکتوب، بازبینی، تأیید مشتری، چاپ رسمی و آرشیف.", ps: "د موضوع ثبت، سند یا مکتوب ترتیب، بیاکتنه، د مراجع تایید، رسمي چاپ او ارشیف.", en: "Record the matter, prepare, review, confirm, print and archive." }, requirements: docs("other-admin"), stages: ["intake", "documents", "execution", "delivery"], publicListed: false },
  "tax-advisory": { label: { fa: "مشاوره مالیاتی", ps: "مالیاتي مشوره", en: "Tax advisory" }, summary: { fa: "بررسی موضوع مالیاتی و ثبت نتیجه مشوره در دوسیه.", ps: "د مالیاتي موضوع ارزونه او په دوسیه کې د مشورې پایله ثبتول.", en: "Review the tax matter and record the advice." }, requirements: docs("tax-advisory"), stages: ["intake", "documents", "execution", "delivery"], publicListed: false },
  "finance-advisory": { label: { fa: "مشاوره مالی", ps: "مالي مشوره", en: "Financial advisory" }, summary: { fa: "تحلیل معلومات مالی و ثبت توصیه‌های عملی در دوسیه.", ps: "د مالي معلوماتو تحلیل او په دوسیه کې د عملي سپارښتنو ثبت.", en: "Analyse financial information and record recommendations." }, requirements: docs("finance-advisory"), stages: ["intake", "documents", "execution", "delivery"], publicListed: false },
  "financial-report": { label: { fa: "تهیه گزارش مالی", ps: "مالي راپور جوړول", en: "Financial report preparation" }, summary: { fa: "تطبیق داده‌ها، تولید گزارش، بازبینی و تحویل گزارش مالی.", ps: "د معلوماتو تطبیق، راپور جوړول، بیاکتنه او سپارل.", en: "Reconcile data, generate, review and deliver the report." }, requirements: docs("financial-report"), stages: ["intake", "documents", "execution", "delivery"], publicListed: false },
  "fx-license": {
    label: { fa: "اخذ جواز صرافی", ps: "د صرافۍ جواز اخیستل", en: "FX licence application" },
    summary: { fa: "ثبت متقاضی، کنترل مدارک، بررسی مالی، حق‌الخدمت، فورم مرجع و ثبت نتیجهٔ رسمی.", ps: "د متقاضي ثبت، د اسنادو کتنه، مالي ارزونه، د خدمت فیس، د مرجع فورم او د رسمي پایلې ثبت.", en: "Register applicant, verify evidence, review finances, collect service fee, prepare authority form and record decision." },
    requirements: docs("fx-license"),
    stages: ["intake", "documents", "execution", "delivery"], publicListed: true,
  },
  "fx-cancel": {
    label: { fa: "لغو جواز صرافی", ps: "د صرافۍ جواز لغوه کول", en: "FX licence cancellation" },
    summary: { fa: "تطبیق جواز، تعهدات و بدهی، مدارک، تصفیه و ثبت مرجع لغو قبل از ختم دوسیه.", ps: "د جواز، تعهدونو، پورونو او اسنادو ارزونه، تصفیه او د دوسیې له تړلو مخکې د لغوه مرجع ثبت.", en: "Check licence, liabilities and evidence; settle obligations and record authority cancellation before closure." },
    requirements: docs("fx-cancel"),
    stages: ["intake", "documents", "execution", "delivery"], publicListed: true,
  },
  "fx-unfreeze": {
    label: { fa: "رفع تعلیق جواز", ps: "د جواز د تعلیق لېرې کول", en: "Lift licence suspension" },
    summary: { fa: "ثبت دلیل تعلیق، تعهدات، اقدامات اصلاحی، مدارک و پرداخت‌ها تا نتیجهٔ مرجع.", ps: "د تعلیق دلیل، تعهدونه، اصلاحي کړنې، اسناد او تادیات د مرجع تر پایلې ثبتول.", en: "Document suspension reason, obligations, remedies, evidence and payments through authority decision." },
    requirements: docs("fx-unfreeze"),
    stages: ["intake", "documents", "execution", "delivery"], publicListed: true,
  },
  "corrective-plan": {
    label: { fa: "ترتیب پلان اصلاحی", ps: "د اصلاح پلان ترتیب", en: "Corrective action plan" },
    summary: { fa: "ثبت مشکل، تعهدهای مرحله‌ای، مبلغ و موعد؛ پرداخت با مدرک، تأیید هر مرحله و پیگیری تأخیر.", ps: "د ستونزې، پړاویز تعهدونو، مبلغ او نېټې ثبت؛ له سند سره تادیه، د هر پړاو تایید او د ځنډ تعقیب.", en: "Record findings, staged commitments, amount and due date; evidence-backed payment, approval and overdue follow-up." },
    requirements: { fa: ["مکتوب یا سند مشکل و تعهد", "معلومات جواز و مشتری", "پلان اصلاحی با مراحل، مسئول و موعد", "اسناد حمایوی اجرای هر مرحله"], ps: ["د ستونزې او تعهد مکتوب یا سند", "د جواز او مراجع معلومات", "د پړاوونو، مسوول او نېټې سره اصلاح پلان", "د هر پړاو د اجرا ملاتړ اسناد"], en: ["Finding or obligation notice", "Licence and client details", "Corrective plan with steps, owner and due dates", "Evidence of completion for each step"] },
    stages: ["intake", "documents", "execution", "delivery"], publicListed: false,
  },
};
