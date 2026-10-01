/** Public-facing service groups shown on the FINORA website (Dari / Pashto / English). */
export const SERVICE_GROUPS = [
  {
    id: "licensing",
    fa: "جواز و خدمات اداری",
    ps: "جواز او اداري خدمتونه",
    en: "Licensing & Administrative Services",
    items: [
      { fa: "اخذ جواز صرافی", ps: "د صرافۍ جواز اخیستل", en: "FX dealer license", dFa: "ترتیب اسناد و آماده‌سازی دوسیه", dPs: "د اسنادو ترتیب او د دوسیې چمتوالی", dEn: "Dossier preparation and document arrangement" },
      { fa: "رفع تعلیق جواز", ps: "د جواز د تعلیق لېرې کول", en: "License suspension lifting", dFa: "بررسی و تکمیل اسناد مورد نیاز", dPs: "د اړینو اسنادو ارزونه او بشپړول", dEn: "Review and completion of required documents" },
      { fa: "لغو جواز صرافی", ps: "د صرافۍ جواز لغوه کول", en: "FX license cancellation", dFa: "تنظیم درخواست و اسناد رسمی", dPs: "د غوښتنلیک او رسمي اسنادو ترتیب", dEn: "Application and official document preparation" },
      { fa: "سایر خدمات اداری", ps: "نور اداري خدمتونه", en: "Other administrative services", dFa: "مکاتیب، درخواست‌ها و اسناد اداری", dPs: "مکتوبونه، غوښتنلیکونه او اداري اسناد", dEn: "Letters, requests and administrative documents" },
    ],
  },
  {
    id: "tax",
    fa: "مالیات و حسابداری",
    ps: "مالیات او محاسبه",
    en: "Tax & Accounting",
    items: [
      { fa: "تصفیه مالیه", ps: "د مالیې تصفیه", en: "Tax settlement", dFa: "بررسی و ترتیب اسناد تصفیه مالیاتی", dPs: "د مالیاتي تصفیې اسنادو ارزونه او ترتیب", dEn: "Review and preparation of tax settlement documents" },
      { fa: "مشاوره مالیاتی", ps: "مالیاتي مشوره", en: "Tax advisory", dFa: "بررسی موضوع و مسیر قانونی دوسیه", dPs: "د موضوع او قانوني لارې ارزونه", dEn: "Subject and legal pathway review" },
      { fa: "مشاوره مالی", ps: "مالي مشوره", en: "Financial advisory", dFa: "بررسی معلومات و نیازهای مالی", dPs: "د معلوماتو او مالي اړتیاو ارزونه", dEn: "Financial data and needs assessment" },
      { fa: "تهیه گزارش مالی", ps: "مالي راپور جوړول", en: "Financial reporting", dFa: "تنظیم گزارش مالی بر اساس اسناد", dPs: "د اسنادو پر بنسټ مالي راپور ترتیب", dEn: "Financial report preparation based on documents" },
    ],
  },
] as const;

export function groupLabel(g: (typeof SERVICE_GROUPS)[number], lang: "fa" | "ps" | "en") {
  return lang === "ps" ? g.ps : lang === "en" ? g.en : g.fa;
}

export function itemLabel(i: { fa: string; ps: string; en: string }, lang: "fa" | "ps" | "en") {
  return lang === "ps" ? i.ps : lang === "en" ? i.en : i.fa;
}
