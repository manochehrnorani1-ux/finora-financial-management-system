'use client';
import { toEnglishDigits } from '@/lib/utils';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';
import { Building, FileText, Printer, RotateCcw, Save, Plus, Trash2, Image as ImageIcon, Download, FileCode } from 'lucide-react';
import { exportElementToWord } from '@/lib/wordExport';
import DabOfficialHeader from './DabOfficialHeader';

export interface LicenseRenewalShareholder {
  id: number;
  name: string;
  fatherName: string;
  tazkiraNo: string;
  sharePercent: string;
  province: string;
  district: string;
}

export interface LicenseRenewalBranch {
  id: number;
  repName: string;
  repFatherName: string;
  repTazkiraNo: string;
  province: string;
  district: string;
  nahia: string;
  market: string;
  shopNo: string;
  branchNoDab: string;
  phone1: string;
  phone2: string;
}

export interface BankAccountItem {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

export interface DabLicenseRenewalData {
  companyNameFa: string;
  companyNameEn: string;
  licenseNo: string;
  issueDate: string;
  phone: string;
  email: string;

  // Address
  province: string;
  district: string;
  nahia: string;
  marketName: string;
  shopNoAndFloor: string;

  // Section 1: Shareholders
  shareholders: LicenseRenewalShareholder[];

  // Section 2: Branches & Staff
  branches: LicenseRenewalBranch[];

  // Section 2: Bank Accounts
  bankAccounts: BankAccountItem[];

  // Section 3: Questions & Changes
  hasMajorChanges: boolean; // Yes / No
  hasActiveOperation: boolean; // Question 1: Active since last year?
  operationNoReason: string;
  hasLawsuitClaims: boolean; // Question 2: Lawsuit claims?
  lawsuitDetails: string;

  // Section 4: Date
  formDate: string;

  // Section 5: DAB Evaluator
  checkOriginalLicense: boolean;
  checkCriminalTaxClearence: boolean;
  checkTaxClearenceLetter: boolean;
  checkGuarantorUpdated: boolean;
  checkGuaranteeAmountComplete: boolean;
  checkAllRequirementsComplete: boolean;
  assessorName: string;
  assessorDate: string;
}

const DEFAULT_LICENSE_RENEWAL_DATA: DabLicenseRenewalData = {
  companyNameFa: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  companyNameEn: 'Barakatullah Ghafouri Money Exchange and MSP Co.',
  licenseNo: '7-0965',
  issueDate: '1402/03/13',
  phone: '0799681111 / 0749340000',
  email: 'info@barakatullah-exchange.af',

  province: 'کندز',
  district: 'مرکز',
  nahia: 'سوم',
  marketName: 'مومند مارکیت',
  shopNoAndFloor: 'منزل دوم دکان 301',

  shareholders: [
    {
      id: 1,
      name: 'برکت‌الله غفوری',
      fatherName: 'عبدالغفور',
      tazkiraNo: '1399-1104-55522',
      sharePercent: '100%',
      province: 'کندز',
      district: 'مرکز کندز / ناحیه 3',
    },
  ],

  branches: [
    {
      id: 1,
      repName: 'اجمل احمدی',
      repFatherName: 'نورآغا',
      repTazkiraNo: '1400-107-46338',
      province: 'کابل',
      district: 'کابل',
      nahia: 'مرکز',
      market: 'شاهزاده',
      shopNo: '188',
      branchNoDab: '7-0965-A1',
      phone1: '0799336520',
      phone2: '0700112233',
    },
    {
      id: 2,
      repName: 'رحمت‌الله',
      repFatherName: 'فیض‌الله',
      repTazkiraNo: '1400-0305-16532',
      province: 'تخار',
      district: 'تالقان',
      nahia: 'مرکز',
      market: 'صرافی',
      shopNo: '12',
      branchNoDab: '7-0965-A2',
      phone1: '0788165320',
      phone2: '',
    },
    {
      id: 3,
      repName: 'محمد یوسف',
      repFatherName: 'عبدالمجید',
      repTazkiraNo: '1399-1205-98680',
      province: 'کندز',
      district: 'امام صاحب',
      nahia: 'مرکز',
      market: 'مرکزی',
      shopNo: '45',
      branchNoDab: '7-0965-A3',
      phone1: '0779986800',
      phone2: '',
    },
    {
      id: 4,
      repName: 'عتیق‌الله',
      repFatherName: 'شمس‌الدین',
      repTazkiraNo: '7252',
      province: 'بدخشان',
      district: 'کشم',
      nahia: 'مرکز',
      market: 'کشم',
      shopNo: '08',
      branchNoDab: '7-0965-A4',
      phone1: '0700007252',
      phone2: '',
    },
    {
      id: 5,
      repName: 'نظام‌الدین',
      repFatherName: 'محی‌الدین',
      repTazkiraNo: '1399-1002-55412',
      province: 'بدخشان',
      district: 'فیض‌آباد',
      nahia: 'مرکز',
      market: 'مرکزی صرافان',
      shopNo: '10',
      branchNoDab: '7-0965-A5',
      phone1: '0700123456',
      phone2: '',
    },
    {
      id: 6,
      repName: 'سمیع‌الله',
      repFatherName: 'اسدالله',
      repTazkiraNo: '1401-1502-99812',
      province: 'بلخ',
      district: 'مزارشریف',
      nahia: 'مرکز',
      market: 'سرای کفایت',
      shopNo: '24',
      branchNoDab: '7-0965-A6',
      phone1: '0799887766',
      phone2: '',
    },
  ],

  bankAccounts: [
    {
      id: 1,
      accountName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
      accountNumber: '100200300400',
      bankName: 'عزیزی بانک',
    },
    {
      id: 2,
      accountName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
      accountNumber: '500600700800',
      bankName: 'افغان ملی بانک',
    },
  ],

  hasMajorChanges: false,
  hasActiveOperation: true,
  operationNoReason: '',
  hasLawsuitClaims: false,
  lawsuitDetails: '',

  formDate: new Date().toISOString().split('T')[0],

  checkOriginalLicense: true,
  checkCriminalTaxClearence: true,
  checkTaxClearenceLetter: true,
  checkGuarantorUpdated: true,
  checkGuaranteeAmountComplete: true,
  checkAllRequirementsComplete: true,
  assessorName: '',
  assessorDate: '',
};

export default function DabLicenseRenewalForm({ 
  isEditMode = true, 
  customLogo: propLogo, 
  onOpenLogoModal, 
  onExportPdf, 
  onExportWord,
  companyId = "default"
}: { 
  isEditMode?: boolean; 
  customLogo?: string | null; 
  onOpenLogoModal?: () => void; 
  onExportPdf?: () => void; 
  onExportWord?: () => void;
  companyId?: string 
} = {}) {
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [data, setData] = useState<DabLicenseRenewalData>(DEFAULT_LICENSE_RENEWAL_DATA);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', `license_renewal_form_v1_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.formData) {
            setData(prev => ({ ...prev, ...remoteData.formData }));
          }
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase load error:", error);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocalLogo(localStorage.getItem(`custom_company_logo_${companyId}`));
      try {
        const saved = localStorage.getItem(`dab_license_renewal_data_${companyId}`);
        if (saved) {
          setData(JSON.parse(saved));
        } else {
          setData(DEFAULT_LICENSE_RENEWAL_DATA);
        }
      } catch (e) {
        console.error('Failed to load DAB license renewal data', e);
      }
    }, 0);

    const handleLogoUpdate = () => {
      setLocalLogo(localStorage.getItem(`custom_company_logo_${companyId}`));
    };
    window.addEventListener('custom_logo_updated', handleLogoUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('custom_logo_updated', handleLogoUpdate);
    };
  }, [companyId]);

  const customLogo = propLogo !== undefined ? propLogo : localLogo;

  const handleSave = async () => {
    try {
      localStorage.setItem(`dab_license_renewal_data_${companyId}`, JSON.stringify(data));
      const docRef = doc(db, 'settings', `license_renewal_form_v1_${companyId}`);
      await setDoc(docRef, { formData: data, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save license renewal data', e);
    }
  };

  const handleReset = () => {
    if (confirm('آیا اطمینان دارید که می‌خواهید تمام اطلاعات این فورم به حالت اولیه بازگردد؟')) {
      setData(DEFAULT_LICENSE_RENEWAL_DATA);
      localStorage.removeItem(`dab_license_renewal_data_${companyId}`);
    }
  };

  const updateField = (field: keyof DabLicenseRenewalData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Shareholders handler
  const updateShareholder = (index: number, field: keyof LicenseRenewalShareholder, value: string) => {
    const list = [...data.shareholders];
    list[index] = { ...list[index], [field]: value };
    setData({ ...data, shareholders: list });
  };

  const addShareholder = () => {
    setData({
      ...data,
      shareholders: [
        ...data.shareholders,
        {
          id: Date.now(),
          name: '',
          fatherName: '',
          tazkiraNo: '',
          sharePercent: '0%',
          province: '',
          district: '',
        },
      ],
    });
  };

  const removeShareholder = (id: number) => {
    if (data.shareholders.length <= 1) return;
    setData({ ...data, shareholders: data.shareholders.filter((s) => s.id !== id) });
  };

  // Branches handler
  const updateBranch = (index: number, field: keyof LicenseRenewalBranch, value: string) => {
    const list = [...data.branches];
    list[index] = { ...list[index], [field]: value };
    setData({ ...data, branches: list });
  };

  const addBranch = () => {
    setData({
      ...data,
      branches: [
        ...data.branches,
        {
          id: Date.now(),
          repName: '',
          repFatherName: '',
          repTazkiraNo: '',
          province: '',
          district: '',
          nahia: '',
          market: '',
          shopNo: '',
          branchNoDab: `DAB/7-0965-A${data.branches.length + 1}`,
          phone1: '',
          phone2: '',
        },
      ],
    });
  };

  const removeBranch = (id: number) => {
    setData({ ...data, branches: data.branches.filter((b) => b.id !== id) });
  };

  // Bank Accounts handler
  const updateBankAccount = (index: number, field: keyof BankAccountItem, value: string) => {
    const list = [...data.bankAccounts];
    list[index] = { ...list[index], [field]: value };
    setData({ ...data, bankAccounts: list });
  };

  const addBankAccount = () => {
    setData({
      ...data,
      bankAccounts: [
        ...data.bankAccounts,
        {
          id: Date.now(),
          accountName: data.companyNameFa,
          accountNumber: '',
          bankName: '',
        },
      ],
    });
  };

  const removeBankAccount = (id: number) => {
    setData({ ...data, bankAccounts: data.bankAccounts.filter((acc) => acc.id !== id) });
  };

  return (
    <div className={`w-full max-w-5xl mx-auto py-4 px-2 sm:px-6 dir-rtl text-slate-900 font-sans ${!isEditMode ? 'static-view-mode' : ''}`}>
      <style>{`
        .static-view-mode input[type="text"], 
        .static-view-mode input[type="number"],
        .static-view-mode textarea {
          border: none !important;
          background: transparent !important;
          pointer-events: none !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          font-weight: 800 !important;
          color: #1e3a8a !important;
          box-shadow: none !important;
          min-height: auto !important;
        }
        .static-view-mode .print-hidden-in-static {
          display: none !important;
        }
      `}</style>
      {/* Top Controls Toolbar */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900 text-white rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی</h2>
            <p className="text-xs text-slate-500">
              آمریت عمومی نظارت از مؤسسات مالی غیر بانکی - مدیریت جواز دهی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenLogoModal && isEditMode && (
            <button
              type="button"
              onClick={onOpenLogoModal}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300"
            >
              <ImageIcon className="w-4 h-4 text-blue-900" />
              {customLogo ? 'تغییر لوگوی شرکت' : 'آپلود لوگوی شرکت'}
            </button>
          )}

          {isEditMode && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'ذخیره شد!' : 'ذخیره اطلاعات'}
            </button>
          )}

          {isEditMode && (
            <button
              onClick={handleReset}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="پاکسازی / بازنشانی"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (onExportWord) {
                onExportWord();
              } else {
                exportElementToWord({
                  elementId: 'dab-license-renewal-canvas',
                  filename: 'فورم_درخواست_تمدید_جواز_DAB.doc',
                  title: 'فورم درخواستی تمدید جواز فعالیت صرافی و خدمات پولی (د افغانستان بانک)',
                  orientation: 'portrait'
                });
              }
            }}
            className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer shadow-xs"
            title="استخراج این فرم به عنوان فایل Word قابل ویرایش (.doc)"
          >
            <FileCode className="w-4 h-4 text-blue-200" />
            استخراج به Word
          </button>

          {onExportPdf && (
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer shadow-xs"
              title="ذخیره این فرم به عنوان فایل PDF استاندارد"
            >
              <Download className="w-4 h-4" />
              دانلود PDF با کیفیت
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            چاپ فرم
          </button>
        </div>
      </div>

      {/* Official Form Printable Canvas */}
      <div 
        id="dab-license-renewal-canvas" 
        className={`bg-white p-6 sm:p-10 border border-slate-300 rounded-2xl shadow-sm text-sm print:border-none print:shadow-none print:p-0 print:m-0 ${!isEditMode ? 'static-view-mode' : ''}`}
      >
        
        {/* Official Header */}
        <DabOfficialHeader
          storageKey={`license_renewal_form1_${companyId}`}
          
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی صرافی‌ها و خدمات پولی"
          formNumber="فورم شماره (۱)"
          formTitle="فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی (دفتر مرکزی)"
          guidelineText="رهنمود عمومی: این فورم باید با حضور سهمدار/سهمداران در مقابل کارمند مسئول در مدیریت جوازدهی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی یا در حضور داشت کارمند مسئول در آمریت زون مربوط/مدیریت نمایندگی در ولایات امضاء و شصتگذاری گردد. کارمند مسئول خود را مطمئن سازد که فورم درخواستی حسب اسناد و مدارک مربوط خانهپُری گردیده و توسط شخص خود سهمدار/سهمداران امضاء و شصتگذاری میگردد."
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={true}
        />

        {/* Section 1: Shareholders Specs */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش اول: مشخصات سهمدار
          </div>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed mb-4 text-slate-800">
            <p className="font-bold text-slate-900 mb-1">
              به آمریت عمومی نظارت از مؤسسات مالی غیر بانکی / مدیریت نمایندگی!
            </p>
            <p>
              اینجانب/مایان که شهرت ام/ما در جدول آتی تذکر گردیده منحیث سهمدار/سهمداران شرکت صرافی و خدمات پولی (
              <input
                type="text"
                value={data.companyNameFa}
                onChange={(e) => updateField('companyNameFa', e.target.value)}
                className="inline-block mx-1 px-2 py-0.5 border-b-2 border-slate-900 bg-white font-bold text-blue-900 text-center w-64 text-xs"
              />
              ) دارای جواز شماره (
              <input
                type="text"
                value={data.licenseNo}
                onChange={(e) => updateField('licenseNo', e.target.value)}
                className="inline-block mx-1 px-2 py-0.5 border-b-2 border-slate-900 bg-white font-bold text-center w-32 text-xs font-mono"
              />
              ) که به تاریخ (
              <input
                type="text"
                value={data.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
                className="inline-block mx-1 px-2 py-0.5 border-b-2 border-slate-900 bg-white font-bold text-center w-28 text-xs font-mono"
              />
              ) جواز فعالیت را از د افغانستان بانک بدست آورده بودم/بودیم، مدت اعتبار آن ختم گردیده است. بدین وسیله تقاضا مینمایم که در راستای تمدید جواز فعالیت این شرکت همکاری نموده ممنون سازید.
            </p>
          </div>

          {/* Shareholders Table */}
          <table className="w-full border-collapse border border-slate-400 text-xs text-center mb-2">
            <thead>
              <tr className="bg-slate-200 text-slate-800 font-bold">
                <th className="border border-slate-400 p-2 w-10">شماره</th>
                <th className="border border-slate-400 p-2">نام</th>
                <th className="border border-slate-400 p-2">نام پدر</th>
                <th className="border border-slate-400 p-2">شماره تذکره</th>
                <th className="border border-slate-400 p-2 w-20">فیصدی سهم</th>
                <th className="border border-slate-400 p-2">ولایت</th>
                <th className="border border-slate-400 p-2">ولسوالی/ناحیه</th>
                <th className="border border-slate-400 p-2 w-16">شصت</th>
                <th className="border border-slate-400 p-2 w-20">امضاء</th>
                {isEditMode && <th className="border border-slate-400 p-2 w-12 print:hidden">حذف</th>}
              </tr>
            </thead>
            <tbody>
              {data.shareholders.map((sh, idx) => (
                <tr key={sh.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={sh.name}
                      onChange={(e) => updateShareholder(idx, 'name', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-bold"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={sh.fatherName}
                      onChange={(e) => updateShareholder(idx, 'fatherName', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      dir="ltr"
                      value={sh.tazkiraNo}
                      onChange={(e) => updateShareholder(idx, 'tazkiraNo', toEnglishDigits(e.target.value))}
                      className="w-full p-1 border rounded bg-white text-left font-sans"
                    />
                  </td>
                  <td className="border border-slate-300 p-1 font-bold">
                    <input
                      type="text"
                      value={sh.sharePercent}
                      onChange={(e) => updateShareholder(idx, 'sharePercent', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center text-blue-900 font-bold"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={sh.province}
                      onChange={(e) => updateShareholder(idx, 'province', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={sh.district}
                      onChange={(e) => updateShareholder(idx, 'district', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-400 text-[10px]">شصت</td>
                  <td className="border border-slate-300 p-1 text-slate-400 text-[10px]">امضاء</td>
                  {isEditMode && (
                    <td className="border border-slate-300 p-1 print:hidden">
                      <button
                        onClick={() => removeShareholder(sh.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isEditMode && (
            <div className="print:hidden">
              <button
                onClick={addShareholder}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer"
              >
                + افزودن سهمدار جدید
              </button>
            </div>
          )}
        </div>

        {/* Section 2: License Specifications */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش دوم: مشخصات جواز فعالیت
          </div>

          <p className="text-xs font-bold text-slate-800 mb-2">
            ۱. در جدول ذیل مشخصات جواز فعالیت را درج نمایید.
          </p>

          <table className="w-full border-collapse border border-slate-400 text-xs mb-6">
            <tbody>
              <tr>
                <td className="border border-slate-400 bg-slate-100 p-2 font-bold w-1/5" rowSpan={2}>آدرس شرکت:</td>
                <td className="border border-slate-400 bg-slate-50 p-1 text-center font-semibold">ولایت</td>
                <td className="border border-slate-400 bg-slate-50 p-1 text-center font-semibold">ولسوالی</td>
                <td className="border border-slate-400 bg-slate-50 p-1 text-center font-semibold">ناحیه</td>
                <td className="border border-slate-400 bg-slate-50 p-1 text-center font-semibold">مارکیت</td>
                <td className="border border-slate-400 bg-slate-50 p-1 text-center font-semibold">منزل و شماره دکان</td>
              </tr>
              <tr>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.province}
                    onChange={(e) => updateField('province', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                </td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.district}
                    onChange={(e) => updateField('district', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                </td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.nahia}
                    onChange={(e) => updateField('nahia', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                </td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.marketName}
                    onChange={(e) => updateField('marketName', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                </td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.shopNoAndFloor}
                    onChange={(e) => updateField('shopNoAndFloor', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                </td>
              </tr>

              <tr>
                <td className="border border-slate-400 bg-slate-100 p-2 font-bold">نام شرکت (فارسی):</td>
                <td className="border border-slate-400 p-1 font-bold text-blue-900" colSpan={3}>
                  <input
                    type="text"
                    value={data.companyNameFa}
                    onChange={(e) => updateField('companyNameFa', e.target.value)}
                    className="w-full p-1 border rounded font-bold text-blue-900"
                  />
                </td>
                <td className="border border-slate-400 bg-slate-100 p-2 font-bold">شماره تماس:</td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full p-1 border rounded font-mono text-center"
                  />
                </td>
              </tr>

              <tr>
                <td className="border border-slate-400 bg-slate-100 p-2 font-bold">نام شرکت به انگلیسی:</td>
                <td className="border border-slate-400 p-1 font-semibold" colSpan={3}>
                  <input
                    type="text"
                    value={data.companyNameEn}
                    onChange={(e) => updateField('companyNameEn', e.target.value)}
                    className="w-full p-1 border rounded font-mono text-left dir-ltr"
                  />
                </td>
                <td className="border border-slate-400 bg-slate-100 p-2 font-bold">ایمیل آدرس:</td>
                <td className="border border-slate-400 p-1">
                  <input
                    type="text"
                    value={data.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full p-1 border rounded font-mono text-center"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* List of Branches & Official Staff */}
          <p className="text-xs font-bold text-slate-800 mb-2">
            ۲. لیست و مشخصات تمام نمایندگیها و کارمندان رسمی:
          </p>

          <table className="w-full border-collapse border border-slate-400 text-xs text-center mb-2">
            <thead>
              <tr className="bg-slate-200 text-slate-800 font-bold">
                <th className="border border-slate-400 p-2" colSpan={3}>مشخصات نماینده رسمی</th>
                <th className="border border-slate-400 p-2" colSpan={5}>موقعیت نمایندگی</th>
                <th className="border border-slate-400 p-2">شماره نمایندگی طبق جواز</th>
                <th className="border border-slate-400 p-2">شماره تماس</th>
                {isEditMode && <th className="border border-slate-400 p-2 w-12 print:hidden">حذف</th>}
              </tr>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-400 p-1 font-semibold">اسم</th>
                <th className="border border-slate-400 p-1 font-semibold">ولد</th>
                <th className="border border-slate-400 p-1 font-semibold">نمبر تذکره</th>
                <th className="border border-slate-400 p-1 font-semibold">ولایت</th>
                <th className="border border-slate-400 p-1 font-semibold">ولسوالی</th>
                <th className="border border-slate-400 p-1 font-semibold">ناحیه</th>
                <th className="border border-slate-400 p-1 font-semibold">مارکیت</th>
                <th className="border border-slate-400 p-1 font-semibold">نمبر دکان</th>
                <th className="border border-slate-400 p-1 font-semibold">طبق جواز</th>
                <th className="border border-slate-400 p-1 font-semibold">تماس</th>
                <th className="border border-slate-400 p-1 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b, idx) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.repName}
                      onChange={(e) => updateBranch(idx, 'repName', e.target.value)}
                      className="w-full p-1 border rounded bg-white font-bold text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.repFatherName}
                      onChange={(e) => updateBranch(idx, 'repFatherName', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.repTazkiraNo}
                      onChange={(e) => updateBranch(idx, 'repTazkiraNo', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-mono"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.province}
                      onChange={(e) => updateBranch(idx, 'province', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.district}
                      onChange={(e) => updateBranch(idx, 'district', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.nahia}
                      onChange={(e) => updateBranch(idx, 'nahia', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.market}
                      onChange={(e) => updateBranch(idx, 'market', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.shopNo}
                      onChange={(e) => updateBranch(idx, 'shopNo', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.branchNoDab}
                      onChange={(e) => updateBranch(idx, 'branchNoDab', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-mono font-bold text-blue-900"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={b.phone1}
                      onChange={(e) => updateBranch(idx, 'phone1', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-mono"
                    />
                  </td>
                  {isEditMode && (
                    <td className="border border-slate-300 p-1 print:hidden text-center">
                      <button
                        onClick={() => removeBranch(b.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {isEditMode && (
            <div className="mb-6 print:hidden">
              <button
                onClick={addBranch}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer"
              >
                + افزودن نمایندگی/کارمند جدید
              </button>
            </div>
          )}

          {/* List of Bank Accounts */}
          <p className="text-xs font-bold text-slate-800 mb-2">
            ۳. لیست حسابات بانکی مربوط به شرکت:
          </p>

          <table className="w-full border-collapse border border-slate-400 text-xs text-center mb-2">
            <thead>
              <tr className="bg-slate-200 text-slate-800 font-bold">
                <th className="border border-slate-400 p-2 w-12">شماره</th>
                <th className="border border-slate-400 p-2">نام حساب بانکی</th>
                <th className="border border-slate-400 p-2">نمبر حساب</th>
                <th className="border border-slate-400 p-2">بانک مربوطه</th>
                {isEditMode && <th className="border border-slate-400 p-2 w-12 print:hidden">حذف</th>}
              </tr>
            </thead>
            <tbody>
              {data.bankAccounts.map((acc, idx) => (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={acc.accountName}
                      onChange={(e) => updateBankAccount(idx, 'accountName', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-bold"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={acc.accountNumber}
                      onChange={(e) => updateBankAccount(idx, 'accountNumber', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center font-mono"
                      placeholder="شماره حساب بانکی..."
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => updateBankAccount(idx, 'bankName', e.target.value)}
                      className="w-full p-1 border rounded bg-white text-center"
                      placeholder="نام بانک..."
                    />
                  </td>
                  {isEditMode && (
                    <td className="border border-slate-300 p-1 print:hidden text-center">
                      <button onClick={() => removeBankAccount(acc.id)} className="text-red-600 hover:text-red-800 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isEditMode && (
            <div className="print:hidden">
              <button
                onClick={addBankAccount}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer"
              >
                + افزودن حساب بانکی جدید
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Requested Changes */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش سوم: تغییرات مطالبه شده حین تمدید جواز فعالیت
          </div>

          <p className="text-xs text-slate-600 mb-3 font-semibold">
            این بخش صرف در حالتی تکمیل میگردد که شرکت صرافی و خدمات پولی خواهان تغییرات در مشخصات جواز حین پروسه تمدید باشد.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-4 mb-4">
            <div>
              <p className="font-bold text-slate-900 mb-2">
                آیا شرکت شما حین پروسه تمدید خواهان تغییرات عمده از قبیل (تغییر محل فعالیت / تغییر نام تجارتی / انتقال مالکیت - حذف سهمدار و یا ازدیاد سهمدار جدید / تغییر در تشکیلات / تغییرات در نوع خدمات / تغییر در ضامن / تغییرات در نماینده‌ها / تغییرات در نمایندگی و غیره) می‌باشد یا خیر؟
              </p>
              <div className="flex items-center gap-6 my-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasMajorChanges"
                    checked={data.hasMajorChanges === true}
                    onChange={() => updateField('hasMajorChanges', true)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">بلی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasMajorChanges"
                    checked={data.hasMajorChanges === false}
                    onChange={() => updateField('hasMajorChanges', false)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">نخیر</span>
                </label>
              </div>
              {data.hasMajorChanges && (
                <p className="text-[11px] text-amber-800 font-bold mt-1">
                  * بمنظور طی مراحل تغییر فوق الذکر، نیاز است فورم مورد نظر جداگانه نیز تکمیل گردد.
                </p>
              )}
            </div>

            <hr className="border-slate-200" />

            <div>
              <p className="font-bold text-slate-900 mb-2">
                ۱- آیا شرکت صرافی و خدمات پولی شما از سال گذشته تا اکنون فعالیت داشته است یا خیر، در صورت پاسخ منفی باشد دلایل آن را بنگارید؟
              </p>
              <div className="flex items-center gap-6 my-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasActiveOperation"
                    checked={data.hasActiveOperation === true}
                    onChange={() => updateField('hasActiveOperation', true)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">بلی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasActiveOperation"
                    checked={data.hasActiveOperation === false}
                    onChange={() => updateField('hasActiveOperation', false)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">نخیر</span>
                </label>
              </div>
              {!data.hasActiveOperation && (
                <div className="mt-2">
                  <textarea
                    value={data.operationNoReason}
                    onChange={(e) => updateField('operationNoReason', e.target.value)}
                    placeholder="دلایل عدم فعالیت از سال گذشته تا کنون..."
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs h-16"
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            <div>
              <p className="font-bold text-slate-900 mb-2">
                ۲- آیا شما و یا شرکتهایی که شما در آن سهمدار هستید بر علیه تان توسط اشخاص حکمی و حقیقی کدام دعوی صورت گرفته است یا خیر، درصورتیکه پاسخ مثبت باشد، دلایل آن را شرح دهید؟
              </p>
              <div className="flex items-center gap-6 my-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasLawsuitClaims"
                    checked={data.hasLawsuitClaims === true}
                    onChange={() => updateField('hasLawsuitClaims', true)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">بلی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasLawsuitClaims"
                    checked={data.hasLawsuitClaims === false}
                    onChange={() => updateField('hasLawsuitClaims', false)}
                    className="w-4 h-4 text-blue-900"
                  />
                  <span className="font-bold">نخیر</span>
                </label>
              </div>
              {data.hasLawsuitClaims && (
                <div className="mt-2">
                  <textarea
                    value={data.lawsuitDetails}
                    onChange={(e) => updateField('lawsuitDetails', e.target.value)}
                    placeholder="توضیحات در مورد دعاوی حقوقی..."
                    className="w-full p-2 border border-slate-300 rounded bg-white text-xs h-16"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Shareholder Affirmation & Fingerprints */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش چهارم: شصت و امضای سهمداران
          </div>

          <p className="text-xs leading-relaxed text-slate-800 p-3 bg-slate-50 border border-slate-300 rounded-lg mb-4 font-semibold">
            بدین وسیله اقرار میدارم/میداریم که معلومات ارائه شده در این فورم توسط من/ما، درست بوده و مکمل میباشد. در صورتیکه معلومات ارائه شده من/ما نادرست باشد و یا کدام تخلف در آن دیده شود، حاضرم/حاضریم که با من/ما طبق قوانین و مقررات نافذۀ کشور برخورد صورت گیرد.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {data.shareholders.map((sh, idx) => (
              <div key={sh.id} className="border border-slate-300 rounded-xl p-3 text-center bg-slate-50/50">
                <div className="font-bold text-slate-900 text-sm mb-1">
                  سهمدار {idx + 1}: {sh.name}
                </div>
                <div className="text-[11px] text-blue-900 font-bold mb-3">({sh.sharePercent} سهام)</div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <div className="flex justify-around items-center pt-1 text-slate-600">
                  <span>شصت: ________</span>
                  <span>امضاء: ________</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs font-bold text-left text-slate-700">
            تاریخ: 
            <input
              type="text"
              value={data.formDate}
              onChange={(e) => updateField('formDate', e.target.value)}
              className="inline-block mx-2 px-2 py-1 border rounded bg-white font-mono text-center w-32"
            />
          </div>
        </div>

        {/* Section 5: Completed by DAB Assessor */}
        <div className="border-2 border-slate-400 rounded-xl p-4 bg-slate-50 text-xs">
          <div className="bg-slate-900 text-white font-bold px-3 py-1 rounded text-xs inline-block mb-3">
            بخش پنجم: ارزیابی کارمند د افغانستان بانک
          </div>

          <p className="font-bold text-slate-800 mb-3">
            این قسمت توسط کارمند مسئول (ارزیابیکننده) د افغانستان بانک خانهپُری و امضاء میگردد:
          </p>

          <p className="text-xs text-slate-700 mb-3 leading-relaxed">
            ۱. کارمند مسئول مدیریت جوازدهی و کارمند مسئول در آمریت زون مربوط/نمایندگی د افغانستان بانک (در ولایات) با دریافت درخواستی، اسناد آنرا بررسی مینماید. با در نظرداشت سوابق و اسناد موجود کارمند مسئول گزینههای ذیل را نشانی و اجراآت مینماید:
          </p>

          <div className="space-y-2.5 mb-6 text-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkOriginalLicense}
                onChange={(e) => updateField('checkOriginalLicense', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>درخواستکننده اصل جواز فعالیت شرکت صرافی و خدمات پولی خویش را تسلیم نموده است؛</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkCriminalTaxClearence}
                onChange={(e) => updateField('checkCriminalTaxClearence', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>استعلام جرم مالیاتی و جنایی کارمندان و نمایندهها (در صورت موجودیت) نشاندهنده آنست که کارمندان و نمایندهها مسئولیت جرم مالی و جنایی ندارد؛</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkTaxClearenceLetter}
                onChange={(e) => updateField('checkTaxClearenceLetter', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>از رفع مسئولیت مالیاتی شرکت ذریعه استعلام / مکتوب حصول اطمینان گردید؛</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkGuarantorUpdated}
                onChange={(e) => updateField('checkGuarantorUpdated', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>تضمینکننده شرکت دارای جواز فعالیت بهروز شده میباشد و کاپی تذکره و کاپی جواز فعالیت کننده تسلیم گردیده و فورمهای تضمینکننده ارائه گردیده و تضمینکننده در حضور ما (ارزیابیکننده) در فورم تضمین امضاء و شصتگذاری نموده است؛</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkGuaranteeAmountComplete}
                onChange={(e) => updateField('checkGuaranteeAmountComplete', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>مبلغ تضمین پولی شرکت حسب اصول تکمیل میباشد؛</span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.checkAllRequirementsComplete}
                onChange={(e) => updateField('checkAllRequirementsComplete', e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded mt-0.5"
              />
              <span>تمام شرایط و معیارها را جهت تمدید جواز فعالیت شرکت صرافی و خدمات پولی تکمیل نموده است؛</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-300 font-bold text-slate-800">
            <div>
              اسم ارزیابیکننده: ___________________
            </div>
            <div>
              امضاء ارزیابیکننده: ___________________
            </div>
            <div>
              تاریخ: ______ / ______ / ________
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
