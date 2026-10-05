'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, Check, RotateCcw, Building, SlidersHorizontal } from 'lucide-react';

export interface HeaderData {
  governmentTitle: string;
  bankName: string;
  department: string;
  directorate: string;
  formTitle: string;
  formNumber: string;
  serialNo?: string;
  letterDate?: string;
  attachments?: string;
  guidelineText?: string;
}

export interface DabOfficialHeaderProps {
  storageKey?: string;
  governmentTitle?: string;
  bankName?: string;
  department?: string;
  directorate?: string;
  formTitle?: string;
  formNumber?: string;
  serialNo?: string;
  letterDate?: string;
  attachments?: string;
  guidelineText?: string;
  companyName?: string;
  licenseNo?: string;
  logoUrl?: string | null;
  showLogo?: boolean;
  isEditable?: boolean;
  onHeaderChange?: (headerData: HeaderData) => void;
  onOpenLogoModal?: () => void;
  className?: string;
}

export default function DabOfficialHeader({
  storageKey,
  governmentTitle: defaultGov = '',
  bankName: defaultBank = 'د افغانستان بانک',
  department: defaultDept = 'آمریت عمومی نظارت از مؤسسات مالی غیر بانکی',
  directorate: defaultDir = 'مدیریت جوازدهی صرافی‌ها و خدمات پولی',
  formTitle: defaultTitle = '',
  formNumber: defaultNum = '',
  serialNo: defaultSerial = '',
  letterDate: defaultDate = '',
  attachments: defaultAttach = '',
  guidelineText: defaultGuide = '',
  companyName,
  licenseNo,
  logoUrl,
  showLogo = true,
  isEditable = true,
  onHeaderChange,
  onOpenLogoModal,
  className = '',
}: DabOfficialHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<HeaderData>({
    governmentTitle: defaultGov,
    bankName: defaultBank,
    department: defaultDept,
    directorate: defaultDir,
    formTitle: defaultTitle,
    formNumber: defaultNum,
    serialNo: defaultSerial,
    letterDate: defaultDate,
    attachments: defaultAttach,
    guidelineText: defaultGuide,
  });

  // Load from localStorage if storageKey is provided
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dab_header_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error('Failed to load header data:', e);
      }
    }
  }, [storageKey]);

  // Keep props in sync if default values change and haven't been manually overridden
  useEffect(() => {
    setData((prev) => ({
      governmentTitle: prev.governmentTitle || defaultGov,
      bankName: prev.bankName || defaultBank,
      department: prev.department || defaultDept,
      directorate: prev.directorate || defaultDir,
      formTitle: defaultTitle !== undefined ? (prev.formTitle || defaultTitle) : prev.formTitle,
      formNumber: defaultNum !== undefined ? (prev.formNumber || defaultNum) : prev.formNumber,
      serialNo: defaultSerial !== undefined ? (prev.serialNo || defaultSerial) : prev.serialNo,
      letterDate: defaultDate !== undefined ? (prev.letterDate || defaultDate) : prev.letterDate,
      attachments: defaultAttach !== undefined ? (prev.attachments || defaultAttach) : prev.attachments,
      guidelineText: defaultGuide !== undefined ? (prev.guidelineText || defaultGuide) : prev.guidelineText,
    }));
  }, [defaultGov, defaultBank, defaultDept, defaultDir, defaultTitle, defaultNum, defaultSerial, defaultDate, defaultAttach, defaultGuide]);

  const updateField = (field: keyof HeaderData, value: string) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(`dab_header_${storageKey}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`dab_header_${storageKey}`, JSON.stringify(data));
    }
    if (onHeaderChange) {
      onHeaderChange(data);
    }
  };

  const handleReset = () => {
    const resetData: HeaderData = {
      governmentTitle: defaultGov,
      bankName: defaultBank,
      department: defaultDept,
      directorate: defaultDir,
      formTitle: defaultTitle,
      formNumber: defaultNum,
      serialNo: defaultSerial,
      letterDate: defaultDate,
      attachments: defaultAttach,
      guidelineText: defaultGuide,
    };
    setData(resetData);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(`dab_header_${storageKey}`);
    }
    if (onHeaderChange) {
      onHeaderChange(resetData);
    }
  };

  return (
    <header
      className={`dab-official-header relative text-center mb-6 pb-4 border-b-2 border-slate-900 ${className}`}
      dir="rtl"
      aria-label="سربرگ رسمی د افغانستان بانک"
    >
      {/* Edit Header Trigger Bar (Hidden in Print) */}
      {isEditable && (
        <div className="flex items-center justify-between gap-2 mb-3 print:hidden bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>سربرگ رسمی فورم</span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors font-bold cursor-pointer"
                  title="بازنشانی به مقادیر پیش‌فرض"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  پیش‌فرض
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  تأیید و ذخیره سربرگ
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-xs text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 font-bold px-3 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                title="ویرایش متون و مشخصات سربرگ"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                ویرایش سربرگ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Centered Logo */}
      {showLogo && (
        <div className="flex flex-col items-center justify-center mb-3">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt="لوگوی شرکت"
              className="w-20 h-20 object-contain border border-slate-200 rounded-2xl p-1 bg-white shadow-xs mx-auto"
            />
          ) : (
            <div className="w-20 h-20 bg-blue-900 text-amber-400 rounded-2xl flex flex-col items-center justify-center font-bold p-1 shadow-xs mx-auto">
              <Building className="w-9 h-9" />
              <span className="text-[10px] mt-1 font-sans">لوگوی شرکت</span>
            </div>
          )}
          {onOpenLogoModal && isEditable && (
            <button
              type="button"
              onClick={onOpenLogoModal}
              className="text-[11px] text-blue-700 hover:underline font-bold print:hidden cursor-pointer mt-1"
            >
              تغییر لوگو
            </button>
          )}
        </div>
      )}

      {/* Header Fields Interactive Editor */}
      {isEditing && (
        <div className="bg-slate-50 dark:bg-slate-900/90 border-2 border-blue-400 rounded-2xl p-4 sm:p-5 mb-5 text-right print:hidden space-y-4 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              پنل تنظیمات و ویرایش اختصاصی متون سربرگ
            </h4>
            <span className="text-[11px] text-slate-500">تغییرات به صورت آنی در چاپ و خروجی‌ها اعمال می‌شود</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">دولت / حاکمیت</label>
              <input
                type="text"
                value={data.governmentTitle}
                onChange={(e) => updateField('governmentTitle', e.target.value)}
                placeholder="عنوان حکومت / دولت"
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">بانک مرکزی / نهاد مرجع</label>
              <input
                type="text"
                value={data.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
                placeholder="د افغانستان بانک"
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-black text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">آمریت عمومی</label>
              <input
                type="text"
                value={data.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">مدیریت / بخش مربوطه</label>
              <input
                type="text"
                value={data.directorate}
                onChange={(e) => updateField('directorate', e.target.value)}
                placeholder="مدیریت جوازدهی صرافی‌ها و خدمات پولی"
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان اصلی فورم / کادر</label>
              <input
                type="text"
                value={data.formTitle}
                onChange={(e) => updateField('formTitle', e.target.value)}
                placeholder="عنوان فورم..."
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">شماره یا پیشوند فورم</label>
              <input
                type="text"
                value={data.formNumber}
                onChange={(e) => updateField('formNumber', e.target.value)}
                placeholder="مثلاً فورم شماره (۱)"
                className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {(data.serialNo !== undefined || data.letterDate !== undefined || data.attachments !== undefined) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">شماره مسلسل / صادر / مکتوب</label>
                <input
                  type="text"
                  value={data.serialNo || ''}
                  onChange={(e) => updateField('serialNo', e.target.value)}
                  placeholder="مثلاً DAB/7-0965-REN"
                  className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ</label>
                <input
                  type="text"
                  value={data.letterDate || ''}
                  onChange={(e) => updateField('letterDate', e.target.value)}
                  placeholder="مثلاً ۱۴۰۳/۰۴/۱۵"
                  className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">ضمایم</label>
                <input
                  type="text"
                  value={data.attachments || ''}
                  onChange={(e) => updateField('attachments', e.target.value)}
                  placeholder="مثلاً دارد / ندارد"
                  className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">متن رهنمود عمومی سربرگ (اختیاری)</label>
            <textarea
              value={data.guidelineText || ''}
              onChange={(e) => updateField('guidelineText', e.target.value)}
              rows={2}
              placeholder="توضیحات و رهنمود رسمی زیر سربرگ..."
              className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Official Government & Bank Titles */}
      <div className="text-center mb-3">
        {data.governmentTitle && (
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">{data.governmentTitle}</div>
        )}
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-1 leading-snug">{data.bankName}</h1>
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-1 leading-snug">{data.department}</h2>
        {data.directorate && (
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{data.directorate}</h3>
        )}
      </div>

      {/* Form Main Title Badge */}
      {data.formTitle && (
        <div className="mt-2.5">
          <div className="inline-block bg-slate-100 dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-600 font-black text-slate-950 dark:text-slate-50 px-6 py-2 rounded-xl text-base shadow-xs">
            {data.formNumber ? `${data.formNumber} — ${data.formTitle}` : data.formTitle}
          </div>
        </div>
      )}

      {/* Serial / Date / Attachments Row if populated */}
      {(data.serialNo || data.letterDate || data.attachments) && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
          {data.serialNo && (
            <div>
              <span>شماره: </span>
              <strong className="font-mono text-blue-900 dark:text-blue-300">{data.serialNo}</strong>
            </div>
          )}
          {data.letterDate && (
            <div>
              <span>تاریخ: </span>
              <strong>{data.letterDate}</strong>
            </div>
          )}
          {data.attachments && (
            <div>
              <span>ضمایم: </span>
              <strong>{data.attachments}</strong>
            </div>
          )}
        </div>
      )}

      {/* Guideline text */}
      {data.guidelineText && (
        <p className="text-xs text-amber-900 dark:text-amber-200 mt-3 font-semibold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg inline-block leading-relaxed text-right">
          {data.guidelineText}
        </p>
      )}

      {/* Company Name & License Number if passed */}
      {(companyName || licenseNo) && (
        <div className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300 flex flex-wrap justify-center gap-4 border-t border-slate-200 dark:border-slate-700 pt-2">
          {companyName && <span>نام شرکت: <strong className="text-blue-900 dark:text-blue-300">{companyName}</strong></span>}
          {licenseNo && <span>شماره جواز: <strong className="font-mono text-slate-900 dark:text-slate-100">{licenseNo}</strong></span>}
        </div>
      )}
    </header>
  );
}

