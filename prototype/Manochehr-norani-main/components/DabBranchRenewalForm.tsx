'use client';
import { toEnglishDigits } from '@/lib/utils';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';
import { Building, FileText, CheckCircle2, Printer, RotateCcw, Save, ShieldAlert, CheckSquare, Square, Image as ImageIcon, Download, FileCode } from 'lucide-react';
import { exportElementToWord } from '@/lib/wordExport';
import DabOfficialHeader from './DabOfficialHeader';

export interface BranchRenewalData {
  // Section 1: Company details
  companyName: string;
  licenseNo: string;
  centralProvince: string;
  centralDistrict: string;
  centralMarket: string;
  centralShopNo: string;
  companyPhone: string;
  companyEmail: string;

  // Section 1: Branch and Representative details
  branchProvince: string;
  branchNo: string;
  branchMarketName: string;
  branchShopNo: string;
  branchLocation: string;

  repResProv: string;
  repResDistrict: string;
  repResVillage: string;

  repName: string;
  repFatherName: string;
  repTazkiraNo: string;
  repPhone: string;

  // Section 2: Education
  educationLevel: 'baccalaureate' | 'higher' | 'other';
  educationOtherText: string;

  // Verification & Signatures
  boardHeadName: string;
  boardHeadFather: string;
  shareholder1Name: string;
  shareholder2Name: string;

  formDate: string;

  // Section 3: Official Assessment
  assessorName: string;
  assessorDate: string;
  supervisorName: string;
  supervisorDate: string;
}

export interface BranchPreset {
  id: string;
  title: string;
  branchNo: string;
  branchProvince: string;
  branchMarketName: string;
  branchShopNo: string;
  branchLocation: string;
  repName: string;
  repFatherName: string;
  repTazkiraNo: string;
  repPhone: string;
  repResProv: string;
  repResDistrict: string;
  repResVillage: string;
  educationLevel: 'baccalaureate' | 'higher' | 'other';
  educationOtherText?: string;
}

export const REAL_BRANCHES_PRESETS: BranchPreset[] = [
  {
    id: 'kabul',
    title: 'نمایندگی اول: ولایت کابل (7-0965-A1)',
    branchNo: '1',
    branchProvince: 'کابل',
    branchMarketName: 'مارکیت سرای شهزاده',
    branchShopNo: 'منزل اول دکان 188',
    branchLocation: 'کابل، سرای شهزاده',
    repName: 'اجمل احمدی',
    repFatherName: 'نورآغا',
    repTazkiraNo: '1400-107-46338',
    repPhone: '0799336520',
    repResProv: 'کابل',
    repResDistrict: 'ناحیه اول',
    repResVillage: 'مرکز',
    educationLevel: 'higher',
  },
  {
    id: 'takhar',
    title: 'نمایندگی دوم: ولایت تخار (7-0965-A2)',
    branchNo: '2',
    branchProvince: 'تخار',
    branchMarketName: 'صرافی صرافان تخار',
    branchShopNo: 'دکان 12',
    branchLocation: 'مرکز تالقان، مارکیت صرافان',
    repName: 'رحمت‌الله',
    repFatherName: 'فیض‌الله',
    repTazkiraNo: '1400-1305-16532',
    repPhone: '0788165320',
    repResProv: 'تخار',
    repResDistrict: 'تالقان',
    repResVillage: 'مرکز',
    educationLevel: 'baccalaureate',
  },
  {
    id: 'kunduz_imam',
    title: 'نمایندگی سوم: ولسوالی امام‌صاحب (7-0965-A3)',
    branchNo: '3',
    branchProvince: 'کندز',
    branchMarketName: 'مارکیت مرکزی صرافان',
    branchShopNo: 'دکان 45',
    branchLocation: 'بازار مرکزی امام صاحب',
    repName: 'محمد یوسف',
    repFatherName: 'عبدالمجید',
    repTazkiraNo: '1399-1205-98680',
    repPhone: '0779986800',
    repResProv: 'کندز',
    repResDistrict: 'امام‌صاحب',
    repResVillage: 'مرکز بازار',
    educationLevel: 'baccalaureate',
  },
  {
    id: 'badakhshan_kishm',
    title: 'نمایندگی چهارم: ولسوالی کشم (7-0965-A4)',
    branchNo: '4',
    branchProvince: 'بدخشان',
    branchMarketName: 'مارکیت صرافان کشم',
    branchShopNo: 'دکان 5',
    branchLocation: 'بازار کشم',
    repName: 'عتیق‌الله',
    repFatherName: 'شمس‌الدین',
    repTazkiraNo: '7252',
    repPhone: '0799681111',
    repResProv: 'بدخشان',
    repResDistrict: 'کشم',
    repResVillage: 'مرکز کشم',
    educationLevel: 'baccalaureate',
  },
  {
    id: 'badakhshan_faizabad',
    title: 'نمایندگی پنجم: ولایت بدخشان / فیض‌آباد (7-0965-A5)',
    branchNo: '5',
    branchProvince: 'بدخشان',
    branchMarketName: 'مارکیت مرکزی صرافان',
    branchShopNo: 'دکان 10',
    branchLocation: 'مرکز فیض‌آباد، مارکیت صرافان',
    repName: 'نظام‌الدین',
    repFatherName: 'محی‌الدین',
    repTazkiraNo: '1399-1002-55412',
    repPhone: '0700123456',
    repResProv: 'بدخشان',
    repResDistrict: 'فیض‌آباد',
    repResVillage: 'مرکز',
    educationLevel: 'higher',
  },
  {
    id: 'balkh_mazar',
    title: 'نمایندگی ششم: ولایت بلخ / مزارشریف (7-0965-A6)',
    branchNo: '6',
    branchProvince: 'بلخ',
    branchMarketName: 'مارکیت سرای کفایت',
    branchShopNo: 'دکان 24',
    branchLocation: 'مزارشریف، سرای کفایت',
    repName: 'سمیع‌الله',
    repFatherName: 'اسدالله',
    repTazkiraNo: '1401-1502-99812',
    repPhone: '0799887766',
    repResProv: 'بلخ',
    repResDistrict: 'مزارشریف',
    repResVillage: 'مرکز',
    educationLevel: 'baccalaureate',
  },
];

const DEFAULT_BRANCH_RENEWAL_DATA: BranchRenewalData = {
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  licenseNo: '7-0965',
  centralProvince: 'کندز',
  centralDistrict: 'مرکز',
  centralMarket: 'مومند مارکیت',
  centralShopNo: 'منزل دوم دکان 301',
  companyPhone: '0799681111 / 0749340000',
  companyEmail: 'info@barakatullah-exchange.af',

  branchProvince: 'تخار',
  branchNo: '2',
  branchMarketName: 'صرافی صرافان',
  branchShopNo: 'دکان 12',
  branchLocation: 'مرکز تالقان، مارکیت صرافان',

  repResProv: 'تخار',
  repResDistrict: 'تالقان',
  repResVillage: 'مرکز',

  repName: 'رحمت‌الله رحیمی',
  repFatherName: 'محمد مراد',
  repTazkiraNo: '1400-1305-16532',
  repPhone: '0788165320',

  educationLevel: 'baccalaureate',
  educationOtherText: '',

  boardHeadName: 'بسم‌الله شیرزی',
  boardHeadFather: 'دوست محمد',
  shareholder1Name: 'برکت‌الله غفوری (مالک 100٪)',
  shareholder2Name: '',

  formDate: new Date().toISOString().split('T')[0],

  assessorName: '',
  assessorDate: '',
  supervisorName: '',
  supervisorDate: '',
};



interface EditableFieldProps {
  isEditMode: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  dir?: string;
  isTazkira?: boolean;
}
const EditableField = ({ isEditMode, value, onChange, placeholder, className = "", dir, isTazkira }: EditableFieldProps) => {
  if (isEditMode) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(isTazkira ? toEnglishDigits(e.target.value) : e.target.value)}
        placeholder={placeholder}
        dir={dir || (isTazkira ? "ltr" : undefined)}
        className={`w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs ${isTazkira ? 'text-left font-sans' : ''} ${className}`}
      />
    );
  }
  return <span className={`inline-block py-1 font-bold text-blue-900 border-b border-transparent ${className}`}>{value || '---'}</span>;
};

export default function DabBranchRenewalForm({ 
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
  const [data, setData] = useState<BranchRenewalData>(DEFAULT_BRANCH_RENEWAL_DATA);
  const [isSaved, setIsSaved] = useState(false);
  const [renderAll, setRenderAll] = useState(false);

  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', `branch_renewal_form_v1_${companyId}`);
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
        const saved = localStorage.getItem(`dab_branch_renewal_data_${companyId}`);
        if (saved) {
          setData(JSON.parse(saved));
        } else {
          setData(DEFAULT_BRANCH_RENEWAL_DATA);
        }
      } catch (e) {
        console.error('Failed to load DAB branch renewal form', e);
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
      localStorage.setItem(`dab_branch_renewal_data_${companyId}`, JSON.stringify(data));
      const docRef = doc(db, 'settings', `branch_renewal_form_v1_${companyId}`);
      await setDoc(docRef, { formData: data, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save', e);
    }
  };

  const handleReset = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام مقادیر این فورم به اطلاعات پیش‌فرض بازگردد؟')) {
      setData(DEFAULT_BRANCH_RENEWAL_DATA);
      localStorage.removeItem(`dab_branch_renewal_data_${companyId}`);
    }
  };

  const handleSelectPreset = (preset: BranchPreset) => {
    setData((prev) => ({
      ...prev,
      branchNo: preset.branchNo,
      branchProvince: preset.branchProvince,
      branchMarketName: preset.branchMarketName,
      branchShopNo: preset.branchShopNo,
      branchLocation: preset.branchLocation,
      repName: preset.repName,
      repFatherName: preset.repFatherName,
      repTazkiraNo: preset.repTazkiraNo,
      repPhone: preset.repPhone,
      repResProv: preset.repResProv,
      repResDistrict: preset.repResDistrict,
      repResVillage: preset.repResVillage,
      educationLevel: preset.educationLevel,
      educationOtherText: preset.educationOtherText || '',
    }));
  };

  const updateField = (field: keyof BranchRenewalData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 sm:px-6 dir-rtl text-slate-900 font-sans">
      {/* Top Controls Toolbar (Hidden in Print) */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900 text-white rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">فورم تمدید نمایندگی (د افغانستان بانک)</h2>
            <p className="text-xs text-slate-500">
              این فورم با امضاء مسئول عملیاتی شرکت به مدیریت جوازدهی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی ارائه می‌گردد.
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
                  elementId: 'dab-branch-renewal-form',
                  filename: 'فورم_درخواست_تمدید_نمایندگی_DAB.doc',
                  title: 'فورم درخواستی تمدید فعالیت نمایندگی (د افغانستان بانک)',
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

      {/* Quick Branch Selection Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-4 mb-6 shadow-md print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm">انتخاب سریع نمایندگی‌های شرکت:</span>
            </div>
            <span className="text-xs text-blue-200 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800 font-mono">
              ۶ نمایندگی رسمی فعال
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              type="button"
              onClick={() => setRenderAll(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                renderAll 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-[1.02]' 
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
              }`}
            >
              <span>همه نمایندگی‌ها (۶ فرم)</span>
            </button>
            {REAL_BRANCHES_PRESETS.map((preset) => {
              const isSelected = !renderAll && data.branchProvince === preset.branchProvince && data.repName === preset.repName;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { setRenderAll(false); handleSelectPreset(preset); }}

                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-[1.02]' 
                      : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                  }`}
                >
                  <span>{preset.title}</span>
                  <span className="text-[10px] opacity-80">({preset.repName})</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* Official Form Canvas */}
      {(renderAll ? REAL_BRANCHES_PRESETS.map(p => ({...data, ...p})) : [data]).map((branchData, index) => (
      <div key={index} id={renderAll ? `dab-branch-renewal-canvas-${index}` : "dab-branch-renewal-canvas"} className={`bg-white p-6 sm:p-10 border border-slate-300 rounded-2xl shadow-sm text-sm print:border-none print:shadow-none print:p-0 print:m-0 ${renderAll ? 'break-after-page mb-8 print:mb-0' : ''}`}>
        
        {/* Official Header */}
        <DabOfficialHeader
          storageKey={`branch_renewal_form2_${companyId}`}
          
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی نمایندگی‌ها"
          formNumber="فورم شماره (۲)"
          formTitle="فورم درخواستی تمدید جواز نمایندگی‌های شرکت صرافی و خدمات پولی"
          guidelineText="رهنمود عمومی: این فورم با امضاء مسئول عملیاتی شرکت صرافی و خدمات پولی به مدیریت جواز دهی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی و یا زون مربوطه، ارائه می گردد."
          companyName={branchData.companyName || 'شرکت صرافی و خدمات پولی برکت‌الله غفوری (سهامی خاص)'}
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={true}
        />

        {/* Section 1: Company & Branch Details */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش اول:
          </div>

          {/* Table 1: Company Info */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-800 mb-2">
              ۱. لطفا در جدول ذیل مشخصات شرکت صرافی و یا خدمات پولی را درج نمایید.
            </p>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 bg-slate-100 p-2 font-bold w-1/4">نام شرکت:</td>
                  <td className="border border-slate-400 p-1.5 font-bold text-blue-950" colSpan={3}>
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.companyName}
                      onChange={(val) => updateField('companyName', val)}
                      className="font-bold text-blue-900"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-100 p-2 font-bold w-1/6">شماره جواز:</td>
                  <td className="border border-slate-400 p-1.5 font-bold font-mono">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.licenseNo}
                      onChange={(val) => updateField('licenseNo', val)}
                      className="font-mono text-center"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 bg-slate-100 p-2 font-bold" rowSpan={2}>
                    موقعیت دفتر مرکزی شرکت:
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold">ولایت</td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold">ناحیه/ولسوالی</td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold">مارکیت</td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold" colSpan={2}>
                    منزل و شماره دکان
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.centralProvince}
                      onChange={(val) => updateField('centralProvince', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.centralDistrict}
                      onChange={(val) => updateField('centralDistrict', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.centralMarket}
                      onChange={(val) => updateField('centralMarket', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 p-1" colSpan={2}>
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.centralShopNo}
                      onChange={(val) => updateField('centralShopNo', val)}
                      className="text-center"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 bg-slate-100 p-2 font-bold" rowSpan={2}>
                    پل ارتباطی با شرکت:
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold" colSpan={2}>
                    شماره تیلیفون
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1.5 text-center font-semibold" colSpan={3}>
                    ایمیل آدرس
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1" colSpan={2}>
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.companyPhone}
                      onChange={(val) => updateField('companyPhone', val)}
                      className="font-mono text-center"
                    />
                  </td>
                  <td className="border border-slate-400 p-1" colSpan={3}>
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.companyEmail}
                      onChange={(val) => updateField('companyEmail', val)}
                      className="font-mono text-center"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: Branch and Representative Details */}
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-800 mb-2">
              ۲. لطفاً در جدول ذیل مشخصات نماینده گی تحت اثر و نماینده را درج نمایید.
            </p>
            <table className="w-full border-collapse border border-slate-400 text-xs text-center">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold">
                  <th className="border border-slate-400 p-2 w-1/3" colSpan={2}>
                    اسم و محل فعالیت نماینده گی شرکت صرافی و خدمات پولی
                  </th>
                  <th className="border border-slate-400 p-2 w-1/4" colSpan={2}>
                    سکونت فعلی
                  </th>
                  <th className="border border-slate-400 p-2 w-5/12" colSpan={2}>
                    شهرت مکمل نماینده با صلاحیت
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">ولایت</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.branchProvince}
                      onChange={(val) => updateField('branchProvince', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">ولایت</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repResProv}
                      onChange={(val) => updateField('repResProv', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">اسم</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repName}
                      onChange={(val) => updateField('repName', val)}
                      className="font-bold text-blue-900 text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">شماره نمایندگی</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.branchNo}
                      onChange={(val) => updateField('branchNo', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">ناحیه/ولسوالی</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repResDistrict}
                      onChange={(val) => updateField('repResDistrict', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">ولد</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repFatherName}
                      onChange={(val) => updateField('repFatherName', val)}
                      className="text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">اسم مارکیت</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.branchMarketName}
                      onChange={(val) => updateField('branchMarketName', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">قریه</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repResVillage}
                      onChange={(val) => updateField('repResVillage', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">نمبر تذکره</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repTazkiraNo}
                      onChange={(val) => updateField('repTazkiraNo', val)} isTazkira
                      className="font-mono text-center"
                    />
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">شماره دکان و منزل</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.branchShopNo}
                      onChange={(val) => updateField('branchShopNo', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">محل فعالیت</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.branchLocation}
                      onChange={(val) => updateField('branchLocation', val)}
                      className="text-center"
                    />
                  </td>
                  <td className="border border-slate-400 bg-slate-50 p-1 font-semibold">شماره تماس نماینده</td>
                  <td className="border border-slate-400 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.repPhone}
                      onChange={(val) => updateField('repPhone', val)}
                      className="font-mono text-center"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Education & Endorsement */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-t-lg text-sm mb-3">
            بخش دوم:
          </div>

          {/* Education level check */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs mb-4">
            <p className="font-bold text-slate-800 mb-2">
              ۱. سطح تحصیلات نماینده با صلاحیت تا چه حد است؟ در صورت داشتن تحصیل، سند تحصیلی را ضمیمه این فورم نمایید.
            </p>
            <div className="flex flex-wrap items-center gap-6 my-2">
              {isEditMode ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="educationLevel"
                      checked={branchData.educationLevel === 'baccalaureate'}
                      onChange={() => updateField('educationLevel', 'baccalaureate')}
                      className="w-4 h-4 text-blue-900"
                    />
                    <span className="font-semibold">بکلوریا (۱۲ پاس)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="educationLevel"
                      checked={branchData.educationLevel === 'higher'}
                      onChange={() => updateField('educationLevel', 'higher')}
                      className="w-4 h-4 text-blue-900"
                    />
                    <span className="font-semibold">دارای تحصیلات عالی (لیسانس / ماستر)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="educationLevel"
                      checked={branchData.educationLevel === 'other'}
                      onChange={() => updateField('educationLevel', 'other')}
                      className="w-4 h-4 text-blue-900"
                    />
                    <span className="font-semibold">سایر موارد</span>
                  </label>
                </>
              ) : (
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {branchData.educationLevel === 'baccalaureate' ? 'بکلوریا (۱۲ پاس)' : 
                     branchData.educationLevel === 'higher' ? 'دارای تحصیلات عالی (لیسانس / ماستر)' : 
                     `سایر موارد: ${branchData.educationOtherText}`}
                  </span>
                </div>
              )}
            </div>

            {isEditMode && branchData.educationLevel === 'other' && (
              <div className="mt-2">
                <EditableField isEditMode={renderAll ? false : isEditMode}
                  value={branchData.educationOtherText}
                  onChange={(val) => updateField('educationOtherText', val)}
                  placeholder="سایر موارد سطح تحصیلات..."
                />
              </div>
            )}
          </div>

          {/* Board of Supervisors Certification */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 mb-4">
            <p className="font-bold text-slate-900 mb-2 border-b pb-1">
              ۲. تصدیق هیأت نظار شرکت صرافی و خدمات پولی:
            </p>
            <p>
              این جانب (
              <EditableField isEditMode={renderAll ? false : isEditMode}
                value={branchData.boardHeadName}
                onChange={(val) => updateField('boardHeadName', val)}
                className="font-bold text-blue-900 w-36 text-center text-xs"
              />
              ) ولد (
              <EditableField isEditMode={renderAll ? false : isEditMode}
                value={branchData.boardHeadFather}
                onChange={(val) => updateField('boardHeadFather', val)}
                className="font-bold w-36 text-center text-xs"
              />
              ) رییس هیأت نظار شرکت صرافی و خدمات پولی (
              <span className="font-bold">{branchData.companyName}</span>) دارای جواز نمبر (
              <span className="font-bold">{branchData.licenseNo}</span>) از اهلیت و شهرت نیک نماینده با صلاحیت (
              <span className="font-bold text-blue-900">{branchData.repName}</span>) تصدیق نموده و موصوف را منحیث نماینده رسمی شرکت به د افغانستان بانک معرفی می نمایم. همچنان بدین وسیله اقرار مینمایم که معلومات ارائه شده در فورم درخواستی هذا را با تمام هوش و حواس خویش خانه پوری نموده و درست و کامل میباشد.
            </p>
          </div>

          {/* Clauses for Branch Renewal */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs mb-4">
            <p className="font-bold text-slate-900 mb-3 border-b pb-1">
              ب: تعهد سهمدار / سهمداران در قسمت تمدید نمایندگی
            </p>

            <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-800">
              <li>
                اینجانب/مایان سهمدار/سهمداران مسئول و پاسخگوی تمام نماینده گی های خویش در مرکز و ولایات میباشم/میباشیم و از تطبیق قوانین و مقررات در تمام فعالیت های شرکت، بشمول نمایندگی های خویش، حصول اطمینان مینمایم/مینهماییم؛
              </li>
              <li>
                تعهد میدارم/میداریم که نمایندگی، تحت اثر شرکت صرافی و خدمات پولی می باشد و همواره از اجراآت خویش به مرکز گزارشدهی می نمایند.
              </li>
              <li>
                به کارکنان نمایندگی بشمول نماینده از طرف دفتر مرکزی معاش مشخص تعیین گردیده و بشکل ماهوار پرداخت می گردد.
              </li>
              <li>
                تمام مسائل مالی از قبیل سرمایه و مفاد و ضرر نمایندگی مربوط به دفتر مرکزی می باشد و طبق هدایات دفتر مرکزی در نمایندگی اجراآت صورت میگیرد.
              </li>
              <li>
                تعهد میدارم/میداریم که نمایندگی صرف مسئولیت تصفیه معاملات با دفتر مرکزی را دارد و بدون توافق و هدایت دفتر مرکزی، نمیتواند بشکل مستقلانه با صرافان و سایر اشخاص اجراآت داشته باشد.
              </li>
              <li>
                قرارداد محل فعالیت نمایندگی از آدرس سهمداران و یا شرکت صرافی و خدمات پولی عقد گردیده و نماینده در آن هیچ نقشی ندارد.
              </li>
              <li>
                نمایندگی از سیستم دفتر مرکزی استفاده می نماید و تمامی معاملات آن وارد سیستم می گردد که همزمان به دفتر مرکزی نمایان و از طرف مسئولین دفتر مرکزی بررسی و نظارت می گردد.
              </li>
              <li>
                از تمامی فعالیت ها و معاملات نمایندگی آگاهی دارم/داریم و تمامی معاملات و اجراآت نمایندگی در هماهنگی با دفتر مرکزی صورت میگیرد.
              </li>
              <li>
                اگر بعد از تعلیق، ترک پیشه یا لغو اجازه نامه نمایندگی، فعالیت های نمایندگی صرافی و خدمات پولی ام در مرکز و یا و لایات کشور آشکار میشود، غیر قانونی بوده و مسئول میباشم؛
              </li>
            </ol>
          </div>

          {/* Signatures Table */}
          <div className="border border-slate-400 rounded-lg overflow-hidden text-xs mt-4">
            <div className="bg-slate-200 font-bold px-3 py-2 text-slate-900 border-b border-slate-400 text-center">
              امضاء مسئولین شرکت صرافی و خدمات پولی
            </div>
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="border-r border-slate-300 p-2 w-1/3">مسئولین</th>
                  <th className="border-r border-slate-300 p-2 w-1/3">نام</th>
                  <th className="p-2 w-1/3">امضاء و شصت</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50">رئیس هیئت نظار</td>
                  <td className="border-r border-slate-300 p-2 font-bold text-blue-900">
                    {branchData.boardHeadName}
                  </td>
                  <td className="p-2">______________________</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50">سهمدار</td>
                  <td className="border-r border-slate-300 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.shareholder1Name}
                      onChange={(val) => updateField('shareholder1Name', val)}
                      className="text-center font-bold"
                    />
                  </td>
                  <td className="p-2">______________________</td>
                </tr>
                <tr>
                  <td className="border-r border-slate-300 p-2 font-bold bg-slate-50">سهمدار</td>
                  <td className="border-r border-slate-300 p-1">
                    <EditableField isEditMode={renderAll ? false : isEditMode}
                      value={branchData.shareholder2Name}
                      onChange={(val) => updateField('shareholder2Name', val)}
                      className="text-center font-bold"
                    />
                  </td>
                  <td className="p-2">______________________</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap justify-between items-center text-xs font-bold pt-2">
            <div>
              مُهر شرکت صرافی و خدمات پولی: <span className="text-blue-900">{branchData.companyName}</span>
            </div>
            <div>
              تاریخ: 
              <EditableField isEditMode={renderAll ? false : isEditMode}
                value={branchData.formDate}
                onChange={(val) => updateField('formDate', val)}
                className="inline-block mx-2 text-center font-mono w-32"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Completed by DAB Officers */}
        <div className="border-2 border-slate-400 rounded-xl p-4 bg-slate-50/80 text-xs">
          <div className="bg-slate-900 text-white font-bold px-3 py-1 rounded text-xs inline-block mb-3">
            بخش سوم:
          </div>
          <p className="font-bold text-slate-800 mb-3">
            این قسمت توسط کارمند مسئول د افغانستان بانک تکمیل می گردد:
          </p>

          <div className="space-y-2 mb-4 text-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-400 rounded bg-white inline-block"></span>
              <span>درخواست کننده دارای جواز فعالیت شرکت صرافی و خدمات پولی از این اداره بوده و جواز اش به روز (Updated) می باشد.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-400 rounded bg-white inline-block"></span>
              <span>کاپی تذکره نماینده با صلاحیت معرفی شده تسلیم گردیده است.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-400 rounded bg-white inline-block"></span>
              <span>
                نماینده صلاحیت دارای سند تحصیلی (________________) با تجربه کاری مرتبط می باشد که اسناد مربوطه ارایه گردیده است.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border border-slate-400 rounded bg-white inline-block"></span>
              <span>فورم هذا حسب اسناد مربوطه، خانه پُری گردیده است.</span>
            </div>
          </div>

          <p className="leading-relaxed text-slate-800 mb-6 bg-white p-3 border rounded border-slate-300">
            با بررسی و ارزیابی این درخواستی و سایر معلومات و مدارک ارائه شده، درخواست کننده واجد شرایط برای اخذ جواز نماینده گی تحت اثر شرکت صرافی و خدمات پولی بوده و نماینده معرفی شده واجد شرایط برای پیشبرد امور نمایندهگی درخواست شده می باشد.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-300 font-bold text-slate-800">
            <div>
              اسم ارزیابی کننده: ___________________
              <div className="mt-2">امضاء ارزیابی کننده: ___________________</div>
            </div>
            <div>
              اسم و امضاء مسئول نظارت ساحوی در زون مربوطه: ___________________
              <div className="mt-2">تاریخ: ______ / ______ / ________</div>
            </div>
          </div>
        </div>

      </div>
      ))}
    </div>
  );
}
