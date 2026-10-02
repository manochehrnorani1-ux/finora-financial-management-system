/* Afghan Solar Hijri (Jalali) calendar conversion utilities */

function div(a: number, b: number) {
  return Math.floor(a / b);
}

export function toJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function toGregorian(jy: number, jm: number, jd: number) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

export function isJalaliLeap(jy: number) {
  return ((((jy - (jy > 0 ? 474 : 473)) % 2820) + 474 + 38) * 682) % 2816 < 682;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export const JALALI_MONTHS = {
  fa: ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"],
  ps: ["وری", "غویی", "غبرگولی", "چنگاښ", "زمری", "وږی", "تله", "لړم", "لیندۍ", "مرغومی", "سلواغه", "کب"],
  en: ["Hamal", "Sawr", "Jawza", "Saratan", "Asad", "Sunbula", "Mizan", "Aqrab", "Qaws", "Jadi", "Dalwa", "Hoot"],
};

/** ISO (YYYY-MM-DD) -> Jalali string YYYY/MM/DD */
export function isoToJalali(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso) : iso;
  if (isNaN(d.getTime())) return "";
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

/** Jalali YYYY/MM/DD -> ISO YYYY-MM-DD */
export function jalaliToIso(j: string): string {
  const parts = j.split(/[\/\-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return "";
  const { gy, gm, gd } = toGregorian(parts[0], parts[1], parts[2]);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayJalali() {
  return toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
}

/** Start/end ISO of Jalali month containing the given ISO date */
export function jalaliMonthRange(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const { jy, jm } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const start = toGregorian(jy, jm, 1);
  const end = toGregorian(jy, jm, jalaliMonthLength(jy, jm));
  const f = (g: { gy: number; gm: number; gd: number }) =>
    `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
  return { start: f(start), end: f(end), jy, jm };
}

export function jalaliYearRange(jy: number) {
  const s = toGregorian(jy, 1, 1);
  const e = toGregorian(jy, 12, jalaliMonthLength(jy, 12));
  const f = (g: { gy: number; gm: number; gd: number }) =>
    `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
  return { start: f(s), end: f(e) };
}

export function jalaliQuarterRange(jy: number, q: number) {
  const sm = (q - 1) * 3 + 1;
  const em = sm + 2;
  const s = toGregorian(jy, sm, 1);
  const e = toGregorian(jy, em, jalaliMonthLength(jy, em));
  const f = (g: { gy: number; gm: number; gd: number }) =>
    `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
  return { start: f(s), end: f(e) };
}

export function formatDate(iso: string | Date | null | undefined, format: "jalali" | "gregorian" = "jalali") {
  if (!iso) return "-";
  if (format === "gregorian") {
    const d = typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso) : iso;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return isoToJalali(iso);
}

export function formatDateTime(v: string | Date | null | undefined, format: "jalali" | "gregorian" = "jalali") {
  if (!v) return "-";
  const d = typeof v === "string" ? new Date(v) : v;
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${formatDate(d, format)} ${t}`;
}


/** Normalize user-entered date digits/separators without applying calendar semantics. */
export function normalizeDateInput(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\/]/g, "-")
    .replace(/\s+/g, "");
}

function validGregorianDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1800 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parse a case opening date at the server boundary.
 * Modern Afghan Solar Hijri years (1200-1799) are interpreted as Jalali;
 * modern Gregorian years (1800+) are interpreted as Gregorian.
 * The database representation is always Gregorian ISO YYYY-MM-DD.
 */
export function parseCaseOpeningDate(value: unknown): string | null {
  const normalized = normalizeDateInput(value);
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year >= 1200 && year <= 1799) {
    if (month < 1 || month > 12 || day < 1 || day > jalaliMonthLength(year, month)) return null;
    const g = toGregorian(year, month, day);
    return g.gy + "-" + String(g.gm).padStart(2, "0") + "-" + String(g.gd).padStart(2, "0");
  }

  if (!validGregorianDate(year, month, day)) return null;
  return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

export function validateCaseOpeningDate(value: unknown): boolean {
  return parseCaseOpeningDate(value) !== null;
}

export function formatCaseOpeningDate(value: string | null | undefined, format: "jalali" | "gregorian" = "jalali") {
  const normalized = normalizeDateInput(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return "-";
  const gy = Number(match[1]), gm = Number(match[2]), gd = Number(match[3]);
  if (!validGregorianDate(gy, gm, gd)) return "-";
  if (format === "gregorian") return normalized;
  const j = toJalali(gy, gm, gd);
  return j.jy + "/" + String(j.jm).padStart(2, "0") + "/" + String(j.jd).padStart(2, "0");
}
