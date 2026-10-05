'use client';
import { toEnglishDigits } from '@/lib/utils';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';
import { 
  UserCheck, 
  Building, 
  FileText, 
  CheckCircle2, 
  Printer, 
  RotateCcw, 
  Save, 
  ShieldAlert, 
  Image as ImageIcon, 
  Download, 
  FileCode,
  Plus,
  Trash2,
  Sparkles,
  User,
  Info,
  CheckSquare,
  Upload,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Award
} from 'lucide-react';
import { exportElementToWord } from '@/lib/wordExport';
import DabOfficialHeader from './DabOfficialHeader';

export interface Guarantor {
  id: number;
  name: string;
  fatherName: string;
  grandfatherName?: string;
  tazkiraNo: string;
  phoneNo: string;
  email: string;
  province: string;
  district: string;
  nahia: string;
  village: string;
  currentProvince: string;
  currentDistrict: string;
  currentNahia: string;
  currentVillage: string;
  businessNameLocation: string;
  photoUrl?: string;
}

export interface GuarantorCompany {
  businessName: string;
  activityType: string;
  licenseNo: string;
  companyPhone: string;
  expiryDate: string;
  email: string;
  issuingAuthority: string;
  businessAddress: string;
}

export interface GuaranteedShareholder {
  id: number;
  name: string;
  fatherName: string;
  grandfatherName?: string;
  tazkiraNo: string;
  sharePercentage?: string;
  phoneNo?: string;
}

export interface GuaranteeFormData {
  docRefNo: string;
  companyName: string;
  provinceName: string;
  guarantors: Guarantor[];
  guarantorCompany: GuarantorCompany;
  shareholders: GuaranteedShareholder[];
  formDate: string;
  dabOfficerName?: string;
  dabOfficerTitle?: string;
  dabOfficerNotes?: string;
}

const DEFAULT_FORM_DATA: GuaranteeFormData = {
  docRefNo: 'DAB/MSP/GUAR/1403/0965',
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  provinceName: 'کندز',
  guarantors: [
    {
      id: 1,
      name: 'بسم‌الله شیرزی',
      fatherName: 'دوست محمد',
      grandfatherName: 'محمد غوث',
      tazkiraNo: '1398-0502-45188',
      phoneNo: '0799681111',
      email: 'bismillah@exchange.af',
      province: 'کندز',
      district: 'مرکز کندز',
      nahia: 'ناحیه اول',
      village: 'مرکز شهر',
      currentProvince: 'کندز',
      currentDistrict: 'مرکز کندز',
      currentNahia: 'ناحیه اول',
      currentVillage: 'مرکز شهر',
      businessNameLocation: 'شرکت تجارتی شیرزی - مارکیت صرافی کندز دکان ۱۰۲',
      photoUrl: '',
    },
    {
      id: 2,
      name: 'عظیم‌الله رحمانی',
      fatherName: 'محمد آجان',
      grandfatherName: 'رحمان‌قل',
      tazkiraNo: '1397-0410-35806',
      phoneNo: '0749340000',
      email: 'azim@exchange.af',
      province: 'کندز',
      district: 'مرکز کندز',
      nahia: 'ناحیه دوم',
      village: 'رسته صرافان',
      currentProvince: 'کندز',
      currentDistrict: 'مرکز کندز',
      currentNahia: 'ناحیه دوم',
      currentVillage: 'رسته صرافان',
      businessNameLocation: 'بازرگانی رحمانی - مارکیت مهمند دکان ۳۰۵',
      photoUrl: '',
    },
    {
      id: 3,
      name: 'صالح محمد',
      fatherName: 'عبدالرحیم',
      grandfatherName: 'غلام نبی',
      tazkiraNo: '1399-0112-48424',
      phoneNo: '0788223344',
      email: 'saleh@exchange.af',
      province: 'کندز',
      district: 'مرکز کندز',
      nahia: 'ناحیه سوم',
      village: 'چهارراهی مخابرات',
      currentProvince: 'کندز',
      currentDistrict: 'مرکز کندز',
      currentNahia: 'ناحیه سوم',
      currentVillage: 'چهارراهی مخابرات',
      businessNameLocation: 'خدمات پولی صالح محمد - مارکیت صرافی کندز دکان ۲۰۴',
      photoUrl: '',
    },
  ],
  guarantorCompany: {
    businessName: 'شرکت خدمات تجارتی و پولی آریا تضمین',
    activityType: 'خدمات تجارتی و پولی (MSP)',
    licenseNo: 'DAB-7-0965',
    companyPhone: '0799681111 / 0749340000',
    expiryDate: '1405/03/13',
    email: 'info@barakatullah-exchange.af',
    issuingAuthority: 'د افغانستان بانک / وزارت صنعت و تجارت',
    businessAddress: 'ولایت کندز، مارکیت مهمند، منزل دوم، دکان نمبر 301',
  },
  shareholders: [
    {
      id: 1,
      name: 'برکت‌الله',
      fatherName: 'عبدالغفور',
      grandfatherName: 'محمدشریف',
      tazkiraNo: '1395-0210-55522',
      sharePercentage: '۶۰٪',
      phoneNo: '0799123456',
    },
    {
      id: 2,
      name: 'نجیب‌الله',
      fatherName: 'عبدالغفور',
      grandfatherName: 'محمدشریف',
      tazkiraNo: '1396-0315-66788',
      sharePercentage: '۴۰٪',
      phoneNo: '0799654321',
    },
  ],
  formDate: '۱۴۰۳/۰۶/۰۱',
  dabOfficerName: 'محمد داوود احمدی',
  dabOfficerTitle: 'مدیر عمومی جوازدهی مؤسسات مالی غیربانکی',
  dabOfficerNotes: 'اسناد و هویت ضامنین و سهمداران بررسی گردید و مورد تأیید می‌باشد.',
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
        value={value || ''}
        onChange={(e) => onChange(isTazkira ? toEnglishDigits(e.target.value) : e.target.value)}
        placeholder={placeholder}
        dir={dir || (isTazkira ? "ltr" : undefined)}
        className={`w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${isTazkira ? 'text-left font-sans' : ''} ${className}`}
      />
    );
  }
  return <span className={`inline-block py-0.5 font-black text-slate-900 ${className}`}>{value || '---'}</span>;
};

export default function DabGuaranteeForm({ 
  isEditMode: initialEditMode = true, 
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
  const [formData, setFormData] = useState<GuaranteeFormData>(DEFAULT_FORM_DATA);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);

  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', `guarantee_form_v1_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.formData) {
            setFormData(prev => ({ ...prev, ...remoteData.formData }));
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
        const saved = localStorage.getItem(`dab_guarantee_form_data_${companyId}`);
        if (saved) {
          setFormData(JSON.parse(saved));
        } else {
          setFormData(DEFAULT_FORM_DATA);
        }
      } catch (e) {
        console.error('Failed to load DAB guarantee form from storage', e);
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
      localStorage.setItem(`dab_guarantee_form_data_${companyId}`, JSON.stringify(formData));
      const docRef = doc(db, 'settings', `guarantee_form_v1_${companyId}`);
      await setDoc(docRef, { formData, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save DAB form', e);
    }
  };

  const handleReset = () => {
    if (confirm('آیا اطمینان دارید که می‌خواهید تمام مقادیر این فورم به حالت اولیه بازگردد؟')) {
      setFormData(DEFAULT_FORM_DATA);
      localStorage.removeItem(`dab_guarantee_form_data_${companyId}`);
    }
  };

  const handleLoadSampleData = () => {
    setFormData(DEFAULT_FORM_DATA);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const updateGuarantor = (index: number, field: keyof Guarantor, value: string) => {
    const newGuarantors = [...formData.guarantors];
    newGuarantors[index] = { ...newGuarantors[index], [field]: value };
    setFormData({ ...formData, guarantors: newGuarantors });
  };

  const handleGuarantorPhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateGuarantor(index, 'photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addGuarantor = () => {
    const newId = formData.guarantors.length ? Math.max(...formData.guarantors.map(g => g.id)) + 1 : 1;
    setFormData({
      ...formData,
      guarantors: [
        ...formData.guarantors,
        {
          id: newId,
          name: '',
          fatherName: '',
          grandfatherName: '',
          tazkiraNo: '',
          phoneNo: '',
          email: '',
          province: '',
          district: '',
          nahia: '',
          village: '',
          currentProvince: '',
          currentDistrict: '',
          currentNahia: '',
          currentVillage: '',
          businessNameLocation: '',
          photoUrl: ''
        }
      ]
    });
  };

  const removeGuarantor = (id: number) => {
    if (formData.guarantors.length <= 1) {
      alert('حداقل یک ضامن باید در فورم ثبت باشد.');
      return;
    }
    setFormData({
      ...formData,
      guarantors: formData.guarantors.filter(g => g.id !== id)
    });
  };

  const updateGuarantorCompany = (field: keyof GuarantorCompany, value: string) => {
    setFormData({
      ...formData,
      guarantorCompany: { ...formData.guarantorCompany, [field]: value },
    });
  };

  const updateShareholder = (index: number, field: keyof GuaranteedShareholder, value: string) => {
    const newShareholders = [...formData.shareholders];
    newShareholders[index] = { ...newShareholders[index], [field]: value };
    setFormData({ ...formData, shareholders: newShareholders });
  };

  const addShareholderRow = () => {
    setFormData({
      ...formData,
      shareholders: [
        ...formData.shareholders,
        { id: Date.now(), name: '', fatherName: '', grandfatherName: '', tazkiraNo: '', sharePercentage: '', phoneNo: '' },
      ],
    });
  };

  const removeShareholderRow = (id: number) => {
    if (formData.shareholders.length <= 1) return;
    setFormData({
      ...formData,
      shareholders: formData.shareholders.filter((s) => s.id !== id),
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 sm:px-6 dir-rtl text-slate-900">
      
      {/* Top Floating Control Toolbar (Hidden in Print) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-6 shadow-md border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-900 dark:text-white leading-snug">
              فورم استندرد تضمین سر سهمدار (د افغانستان بانک)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              تنظیم شهرت ضامنین، سهمداران و تعهدات قانونی مطابق با آخرین مقرره صرافی و خدمات پولی (MSP)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs ${
              isEditMode 
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' 
                : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
            }`}
          >
            {isEditMode ? 'قفل و پیش‌نمایش چاپ' : 'فعال‌سازی حالت ویرایش'}
          </button>

          {isEditMode && (
            <button
              onClick={handleLoadSampleData}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
              title="بارگیری اطلاعات پیش‌فرض و استندرد"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              نمونه داده استندرد
            </button>
          )}

          {onOpenLogoModal && isEditMode && (
            <button
              type="button"
              onClick={onOpenLogoModal}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
              {customLogo ? 'تغییر لوگوی شرکت' : 'آپلود لوگوی شرکت'}
            </button>
          )}

          {isEditMode && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'ذخیره شد!' : 'ذخیره اطلاعات'}
            </button>
          )}

          {isEditMode && (
            <button
              onClick={handleReset}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title="پاکسازی / بازنشانی به حالت اولیه"
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
                  elementId: 'dab-official-form',
                  filename: 'فورم_تضمین_سر_سهمدار_DAB.doc',
                  title: 'فورم تعهدنامه و تضمین سر سهمدار (د افغانستان بانک)',
                  orientation: 'portrait'
                });
              }
            }}
            className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="استخراج این فرم به عنوان فایل Word قابل ویرایش (.doc)"
          >
            <FileCode className="w-4 h-4 text-blue-200" />
            خروجی Word
          </button>

          {onExportPdf && (
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="ذخیره این فرم به عنوان فایل PDF استاندارد"
            >
              <Download className="w-4 h-4" />
              دانلود PDF
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            چاپ فرم
          </button>
        </div>
      </div>

      {/* Official Form Printable Canvas */}
      <div 
        id="dab-guarantee-form-canvas" 
        data-export-id="dab-official-form" 
        className="dab-official-form dab-form-document bg-white p-6 sm:p-10 border border-slate-300 rounded-2xl shadow-sm text-sm print:border-none print:shadow-none print:p-0 print:m-0"
      >
        
        {/* Official Header */}
        <DabOfficialHeader
          storageKey={`guarantee_form_${companyId}`}
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی خدمات پولی و صرافی"
          formNumber={formData.docRefNo || "DAB/MSP/GUAR/1403/0965"}
          formTitle="فورم تعهدنامه و تضمین سر سهمدار / سهمداران شرکت صرافی و خدمات پولی"
          guidelineText="تمامی سهمداران شرکت تضمین کننده مکلف اند تا از سهمدار/سهمداران شرکت صرافی و خدمات پولی، تضمین قانونی نمایند."
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={isEditMode}
        />

        {/* Reference Strip */}
        <div className="flex flex-wrap items-center justify-between bg-slate-100 border-2 border-slate-900 rounded-xl px-4 py-2 my-4 text-xs font-black text-slate-900">
          <div className="flex items-center gap-2">
            <span>کد/نمبر مرجع ثبت:</span>
            <EditableField isEditMode={isEditMode} value={formData.docRefNo} onChange={(val) => setFormData({ ...formData, docRefNo: val })} isTazkira className="font-mono font-bold text-blue-900" />
          </div>
          <div className="flex items-center gap-2">
            <span>تاریخ تنظیم:</span>
            <EditableField isEditMode={isEditMode} value={formData.formDate} onChange={(val) => setFormData({ ...formData, formDate: val })} className="font-mono font-bold text-blue-900" />
          </div>
          <div className="hidden sm:block text-[11px] text-slate-700">
            ضمائم: کپی تذکره، نقل جواز فعالیت، ۲ قطعه عکس
          </div>
        </div>

        {/* Section 1: Guarantors Details */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white font-black px-4 py-2 rounded-t-lg text-sm mb-3 flex items-center justify-between">
            <span>بخش اول: شهرت و مشخصات کامل تضمین کنندگان (سهمداران شرکت ضامن)</span>
            <span className="text-xs text-amber-300 font-bold print:hidden">تعداد ضامنین: {formData.guarantors.length} نفر</span>
          </div>
          
          <div className="text-xs text-slate-800 mb-4 font-bold bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              تمامی سهمداران شرکت تضمین‌کننده مکلف اند با ارائه اسناد معتبر هویت، از سهمدار/سهمداران شرکت صرافی و خدمات پولی به صورت قطعی و قانونی تضمین نمایند.
            </div>
          </div>

          {/* Guarantors Tables */}
          <div className="space-y-8">
            {formData.guarantors.map((guarantor, idx) => (
              <div key={guarantor.id} className="border-2 border-slate-900 rounded-xl overflow-hidden bg-white text-xs shadow-2xs avoid-break">
                <div className="bg-slate-900 text-white font-black px-4 py-2.5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-sm">
                      {idx === 0 ? '۱. شهرت سهم دار اول شرکت تضمین کننده:' : idx === 1 ? '۲. شهرت سهم دار دوم شرکت تضمین کننده:' : idx === 2 ? '۳. شهرت سهم دار سوم شرکت تضمین کننده:' : `${idx + 1}. شهرت سهم دار ضامن:`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md">ضامن #{idx + 1}</span>
                    {isEditMode && formData.guarantors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGuarantor(guarantor.id)}
                        className="text-red-300 hover:text-red-100 font-bold text-xs bg-red-950/80 px-2 py-0.5 rounded cursor-pointer border border-red-800 transition-all"
                      >
                        حذف ضامن
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex flex-col md:flex-row print:flex-row gap-3 items-stretch">
                    
                    {/* 3-Column Detailed Table */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-950 font-black text-center text-xs">
                            <th className="border border-slate-900 py-2 px-2.5 w-[42%] text-right font-black">مشخصات پرسونلی و تشبث ضامن</th>
                            <th className="border border-slate-900 py-2 px-2.5 w-[29%] text-right font-black">سکونت اصلی (مطابق تذکره)</th>
                            <th className="border border-slate-900 py-2 px-2.5 w-[29%] text-right font-black">سکونت فعلی (محل زیست)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-black w-16 text-slate-900 shrink-0">اسم:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.name} onChange={(val) => updateGuarantor(idx, 'name', val)} className="font-black text-slate-950" placeholder="اسم کامل ضامن..." />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ولایت:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.province} onChange={(val) => updateGuarantor(idx, 'province', val)} />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ولایت:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.currentProvince} onChange={(val) => updateGuarantor(idx, 'currentProvince', val)} />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-16 text-slate-800 shrink-0">ولد:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.fatherName} onChange={(val) => updateGuarantor(idx, 'fatherName', val)} placeholder="نام پدر..." />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ولسوالی:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.district} onChange={(val) => updateGuarantor(idx, 'district', val)} />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ولسوالی:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.currentDistrict} onChange={(val) => updateGuarantor(idx, 'currentDistrict', val)} />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-16 text-slate-800 shrink-0">ولدیت:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.grandfatherName || ''} onChange={(val) => updateGuarantor(idx, 'grandfatherName', val)} placeholder="نام پدرکلان..." />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ناحیه:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.nahia} onChange={(val) => updateGuarantor(idx, 'nahia', val)} />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">ناحیه:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.currentNahia} onChange={(val) => updateGuarantor(idx, 'currentNahia', val)} />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-16 text-slate-800 shrink-0">تذکره:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.tazkiraNo} onChange={(val) => updateGuarantor(idx, 'tazkiraNo', val)} isTazkira className="font-mono font-bold" placeholder="شماره تذکره..." />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">قریه:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.village} onChange={(val) => updateGuarantor(idx, 'village', val)} />
                              </div>
                            </td>
                            <td className="border border-slate-900 p-1.5 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-14 text-slate-700 shrink-0">قریه:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.currentVillage} onChange={(val) => updateGuarantor(idx, 'currentVillage', val)} />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle" colSpan={3}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold w-36 text-slate-900 shrink-0">اسم و محل فعالیت تشبث:</span>
                                <EditableField isEditMode={isEditMode} value={guarantor.businessNameLocation} onChange={(val) => updateGuarantor(idx, 'businessNameLocation', val)} placeholder="نام تشبث و آدرس کامل محل فعالیت ضامن..." className="text-slate-950 font-black" />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-900 p-1.5 align-middle" colSpan={3}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                                  <span className="font-bold w-20 text-slate-800 shrink-0">شماره تماس:</span>
                                  <EditableField isEditMode={isEditMode} value={guarantor.phoneNo} onChange={(val) => updateGuarantor(idx, 'phoneNo', val)} className="font-mono font-bold" placeholder="07xxxxxxxx" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-slate-600" />
                                  <span className="font-bold w-20 text-slate-800 shrink-0">ایمیل آدرس:</span>
                                  <EditableField isEditMode={isEditMode} value={guarantor.email} onChange={(val) => updateGuarantor(idx, 'email', val)} placeholder="email@example.com" className="font-mono" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Official Photo & Stamp Box matching DAB official guidelines */}
                    <div className="w-full lg:w-56 flex flex-col border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                      <div className="bg-slate-200 text-slate-950 font-black p-2 text-center text-xs border-b-2 border-slate-900 flex items-center justify-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-700" />
                        <span>محل نصب عکس و تاپه ضامن</span>
                      </div>
                      
                      <div className="flex-1 min-h-[190px] p-2 flex flex-col items-center justify-center text-center bg-white m-2 border-2 border-dashed border-slate-400 rounded-lg relative group">
                        {guarantor.photoUrl ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img 
                              src={guarantor.photoUrl} 
                              alt={`عکس ${guarantor.name || 'ضامن'}`} 
                              className="max-h-36 max-w-full object-contain rounded border border-slate-300 shadow-2xs"
                            />
                            {isEditMode && (
                              <label className="mt-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2 py-1 rounded cursor-pointer border border-slate-300 print:hidden">
                                تغییر عکس
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleGuarantorPhotoUpload(idx, e)} 
                                  className="hidden" 
                                />
                              </label>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2">
                            <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                            <span className="text-[11px] leading-relaxed font-black text-slate-800">
                              عکس (۳×۴) ضامن در این محل چسبانده شده و با مهر تشبث تاپه گردد.
                            </span>
                            {isEditMode && (
                              <label className="mt-3 flex items-center gap-1 text-[11px] bg-blue-900 hover:bg-blue-800 text-white font-black px-3 py-1.5 rounded-lg cursor-pointer shadow-2xs print:hidden">
                                <Upload className="w-3.5 h-3.5" />
                                آپلود عکس ضامن
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleGuarantorPhotoUpload(idx, e)} 
                                  className="hidden" 
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Guarantor Button in Edit Mode */}
          {isEditMode && (
            <div className="mt-4 flex justify-end print:hidden">
              <button
                type="button"
                onClick={addGuarantor}
                className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                افزودن سهم‌دار ضامن جدید
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-600 my-3 font-bold bg-slate-50 p-2 rounded-lg border border-slate-200">
            نوت رسمی: در صورتی که شرکت تضمین‌کننده علاوه بر سهمداران فوق، دارای سهمداران دیگری نیز باشد، خانه‌پُری فورم ضمیمه جهت ثبت شهرت تمامی سهمداران ضامن الزامی است.
          </p>

          {/* Guarantor Company Details Table */}
          <div className="border-2 border-slate-900 rounded-xl overflow-hidden mt-6 text-xs bg-white shadow-2xs avoid-break">
            <div className="bg-slate-900 font-black px-4 py-2 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span className="text-xs">مشخصات و شهرت کامل شرکت / تشبث تضمین کننده:</span>
              </div>
              <span className="text-[11px] text-slate-300 font-normal">اطلاعات رسمی شرکت ضامن</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-slate-300 border-b-2 border-slate-900 dir-rtl">
              <div className="p-2.5 bg-slate-100 font-black text-slate-900">اسم تشبث / شرکت:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.businessName}
                  onChange={(val) => updateGuarantorCompany('businessName', val)}
                  placeholder="اسم شرکت ضامن..."
                  className="font-black text-blue-950"
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">نوع فعالیت تشبث:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.activityType}
                  onChange={(val) => updateGuarantorCompany('activityType', val)}
                  placeholder="نوع فعالیت..."
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">نمبر جواز فعالیت:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.licenseNo}
                  onChange={(val) => updateGuarantorCompany('licenseNo', val)}
                  className="font-mono font-bold"
                  placeholder="شماره جواز..."
                  isTazkira
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">شماره تماس شرکت:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.companyPhone}
                  onChange={(val) => updateGuarantorCompany('companyPhone', val)}
                  className="font-mono font-bold"
                  placeholder="شماره تماس..."
                  isTazkira
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">تاریخ اعتبار جواز:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.expiryDate}
                  onChange={(val) => updateGuarantorCompany('expiryDate', val)}
                  placeholder="۱۴۰x/xx/xx"
                  className="font-mono"
                  isTazkira
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">ایمیل آدرس رسمی:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.email}
                  onChange={(val) => updateGuarantorCompany('email', val)}
                  className="font-mono"
                  placeholder="email@example.com"
                  isTazkira
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">مرجع صادرکننده جواز:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.issuingAuthority}
                  onChange={(val) => updateGuarantorCompany('issuingAuthority', val)}
                  placeholder="وزارت صنعت و تجارت / ..."
                />
              </div>

              <div className="p-2.5 bg-slate-100 font-black text-slate-900">آدرس کامل تشبث:</div>
              <div className="p-2">
                <EditableField isEditMode={isEditMode}
                  value={formData.guarantorCompany.businessAddress}
                  onChange={(val) => updateGuarantorCompany('businessAddress', val)}
                  placeholder="آدرس کامل دفتر..."
                  className="font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Guaranteed Shareholders */}
        <div className="mb-8 avoid-break">
          <div className="bg-slate-900 text-white font-black px-4 py-2 rounded-t-lg text-sm mb-3 flex items-center justify-between">
            <span>بخش دوم: شهرت سهمدار / سهمداران شرکت صرافی و خدمات پولی (شخص تضمین شونده)</span>
            <span className="text-xs text-amber-300 font-bold">تعهدنامه رسمی</span>
          </div>

          <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs leading-relaxed text-slate-900 mb-4 print:bg-white print:p-2 text-justify font-medium">
            مایان هریک که شهرت مکمل مان در بخش اول این فورم ذکر گردیده است، با رضایت کامل، هوشیاری کامل و آگاهی حقوقی اقرار و اظهار می‌داریم که سهمدار/سهمداران آتی‌الذکر که می‌خواهند جواز فعالیت شرکت صرافی و خدمات پولی را تحت اسم تجارتی:
            <EditableField isEditMode={isEditMode}
              value={formData.companyName}
              onChange={(val) => setFormData({ ...formData, companyName: val })}
              className="inline-block mx-2 font-black text-blue-900 text-center w-64 text-xs bg-blue-50/50 px-2 py-0.5 border-b-2 border-blue-800"
              placeholder="نام کامل شرکت..."
            />
            در ولایت:
            <EditableField isEditMode={isEditMode}
              value={formData.provinceName}
              onChange={(val) => setFormData({ ...formData, provinceName: val })}
              className="inline-block mx-2 font-black text-blue-900 text-center w-32 text-xs bg-blue-50/50 px-2 py-0.5 border-b-2 border-blue-800"
              placeholder="ولایت..."
            />
            اخذ و یا تمدید نمایند، رسماً تضمین نموده و متعهد می‌گردیم که در صورت هرگونه تخلف و تخطی از قوانین، مقررات، طرزالعمل‌ها و دستورالعمل‌های د افغانستان بانک و قوانین نافذه کشور، ایشان را در زمان معین به مراجع ذیصلاح حاضر ساخته و مسئولیت جبران خسارات وارده را حسب احکام قانون به عهده می‌گیریم.
          </div>

          {/* Table of Guaranteed Shareholders */}
          <div className="overflow-x-auto border-2 border-slate-900 rounded-xl bg-white shadow-2xs">
            <table className="w-full border-collapse text-xs text-center">
              <thead>
                <tr className="bg-slate-900 text-white font-black">
                  <th className="border border-slate-700 p-2 w-12">شماره</th>
                  <th className="border border-slate-700 p-2">اسم سهمدار تضمین‌شونده</th>
                  <th className="border border-slate-700 p-2">نام پدر</th>
                  <th className="border border-slate-700 p-2">نام پدرکلان</th>
                  <th className="border border-slate-700 p-2">شماره تذکره</th>
                  <th className="border border-slate-700 p-2 w-24">فیصدی سهم</th>
                  <th className="border border-slate-700 p-2">شماره تماس</th>
                  <th className="border border-slate-700 p-2 w-16 print:hidden">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {formData.shareholders.map((shareholder, sIdx) => (
                  <tr key={shareholder.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-300 p-1.5 font-black bg-slate-100">{sIdx + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-bold">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.name}
                        onChange={(val) => updateShareholder(sIdx, 'name', val)}
                        className="text-center font-black text-slate-950"
                        placeholder="اسم سهمدار..."
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.fatherName}
                        onChange={(val) => updateShareholder(sIdx, 'fatherName', val)}
                        className="text-center"
                        placeholder="نام پدر..."
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.grandfatherName || ''}
                        onChange={(val) => updateShareholder(sIdx, 'grandfatherName', val)}
                        className="text-center"
                        placeholder="نام پدرکلان..."
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.tazkiraNo}
                        onChange={(val) => updateShareholder(sIdx, 'tazkiraNo', val)}
                        className="text-center font-mono font-bold"
                        placeholder="شماره تذکره..."
                        isTazkira
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.sharePercentage || ''}
                        onChange={(val) => updateShareholder(sIdx, 'sharePercentage', val)}
                        className="text-center font-bold text-blue-900"
                        placeholder="مثلاً ۵۰٪"
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      <EditableField isEditMode={isEditMode}
                        value={shareholder.phoneNo || ''}
                        onChange={(val) => updateShareholder(sIdx, 'phoneNo', val)}
                        className="text-center font-mono"
                        placeholder="شماره تماس..."
                        isTazkira
                      />
                    </td>
                    <td className="border border-slate-300 p-1.5 print:hidden">
                      <button
                        type="button"
                        onClick={() => removeShareholderRow(shareholder.id)}
                        className="text-red-600 hover:text-red-800 font-bold px-2 py-0.5 rounded cursor-pointer"
                        title="حذف این سهمدار"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-between items-center print:hidden">
            <span className="text-xs text-slate-500 font-medium">مجموع سهمداران تضمین شونده: {formData.shareholders.length} نفر</span>
            {isEditMode && (
              <button
                type="button"
                onClick={addShareholderRow}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-900" />
                افزودن سهمدار جدید
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Commitments & Official Clauses */}
        <div className="mb-8 avoid-break">
          <div className="bg-slate-900 text-white font-black px-4 py-2 rounded-t-lg text-sm mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>بخش سوم: تعهدات قانونی و ضوابط رسمی د افغانستان بانک</span>
          </div>

          <ol className="list-decimal list-inside text-xs leading-relaxed text-slate-900 space-y-2.5 p-4 bg-slate-50 border-2 border-slate-300 rounded-xl print:bg-white print:border-none print:p-0 font-medium text-justify">
            <li className="pl-2">
              <strong className="text-slate-950 font-black">احراز هویت و حضور فیزیکی:</strong> تضمین هذا باید با حضور فیزیکی شخص تضمین‌کننده در مقابل کارمند مسئول در مدیریت جوازدهی آمریت عمومی نظارت از مؤسسات مالی غیربانکی د افغانستان بانک یا در مقابل کارمند مسئول در آمریت زون مربوطه/مدیریت نمایندگی د افغانستان بانک در ولایات امضاء و شصت‌گذاری گردد. کارمند مسئول مکلف است هویت کامل ضامنین را با اسناد اصلی تذکره تثبیت نماید.
            </li>
            <li className="pl-2">
              <strong className="text-slate-950 font-black">ترک ضمانت و معرفی ضامن جدید:</strong> در صورتی که تضمین‌کننده قصد ترک ضمانت داشته باشد یا نخواهد از مالک/سهمدار شرکت صرافی و خدمات پولی فوق تضمین نماید، سهمدار/سهمداران شرکت صرافی مکلف اند قبل از خروج ضامن، کتباً ضامن جدید واجد شرایط را به د افغانستان بانک معرفی نمایند.
            </li>
            <li className="pl-2">
              <strong className="text-slate-950 font-black">استمرار مسئولیت ضامن:</strong> تضمین‌کنندگان الی طی مراحل رسمی، ارزیابی و منظوری کتبی ضامن جدید توسط د افغانستان بانک، کماکان منحیث ضامن قانونی نزد د افغانستان بانک مسئول می‌باشند.
            </li>
            <li className="pl-2">
              <strong className="text-slate-950 font-black">اطلاع‌دهی تغییرات:</strong> هرگاه معلومات ضامن (مندرج بخش اول) تغییر نماید، یا تشبث و جواز فعالیت ضامن لغو/تعلیق گردد، ضامن و سهمداران شرکت مکلف اند ظرف حداکثر ۷ روز کاری د افغانستان بانک را کتباً مطلع سازند؛ در غیر آن مسئولیت پیامدهای حقوقی متوجه ایشان خواهد بود.
            </li>
            <li className="pl-2">
              <strong className="text-slate-950 font-black">مدت اعتبار ضمانت‌خط:</strong> تضمین متذکره برای دوره اعتبار جواز (حداکثر سه سال) معتبر بوده و در زمان تجدید یا تمدید جواز شرکت صرافی و خدمات پولی، ضمانت‌خط هذا نیز تجدید می‌گردد.
            </li>
            <li className="pl-2">
              <strong className="text-slate-950 font-black">عدم قرابت درجه اول:</strong> تضمین‌کننده نباید از جمله اقارب درجه اول (پدر، مادر، فرزند، همسر، برادر و خواهر) شخص تضمین‌شونده باشد.
            </li>
          </ol>

          <p className="text-xs font-black text-slate-900 mt-4 text-center bg-amber-100/70 border border-amber-300 py-2.5 px-4 rounded-xl">
            صحت تمامی معلومات فوق، عکس‌ها، مهر شرکت و نقل اسناد هویت (تذکره و جواز فعالیت) ضامنین و سهمداران مورد تأیید بوده و مسئولیت حقوقی آن بر عهده امضاء‌کنندگان می‌باشد.
          </p>

          {/* Signatures & Thumbprints Grid */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900">
            <div className="text-xs font-black text-slate-900 mb-4 text-center">
              محل امضاء، انگشت شصت و مهر تضمین کنندگان (سهمداران شرکت ضامن)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {formData.guarantors.map((guarantor, idx) => (
                <div key={guarantor.id} className="border-2 border-slate-900 p-3 rounded-xl text-center bg-slate-50 print:bg-white shadow-2xs flex flex-col justify-between min-h-[160px]">
                  <div>
                    <div className="font-black text-slate-900 border-b border-slate-300 pb-1 mb-2 text-xs">
                      تضمین‌کننده {idx === 0 ? 'اول' : idx === 1 ? 'دوم' : idx === 2 ? 'سوم' : `${idx + 1}`}: {guarantor.name || '---'}
                    </div>
                    <div className="text-[11px] text-slate-600 mb-1">ولد: {guarantor.fatherName || '---'}</div>
                  </div>

                  <div className="my-2 border-t border-b border-dashed border-slate-400 py-3 flex items-center justify-around bg-white rounded">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">محل امضاء</div>
                      <div className="h-8 w-20 border-b border-slate-400 mx-auto"></div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">شصت راست</div>
                      <div className="h-10 w-10 border border-slate-400 rounded-md mx-auto flex items-center justify-center text-[9px] text-slate-400">
                        شصت
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-700 font-bold">
                    تاریخ: ____ / ____ / ۱۴۰x
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official DAB Verification & Stamp Box */}
          <div className="mt-8 border-2 border-slate-900 rounded-xl overflow-hidden bg-white shadow-2xs avoid-break">
            <div className="bg-slate-900 text-white font-black px-4 py-2 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>تأییدیه رسمی و منظوری د افغانستان بانک (مدیریت جوازدهی)</span>
              </div>
              <span className="text-[10px] text-amber-300">مخصوص ثبت اداری DAB</span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 shrink-0 w-32">کارمند ثبت کننده:</span>
                  <EditableField isEditMode={isEditMode}
                    value={formData.dabOfficerName || ''}
                    onChange={(val) => setFormData({ ...formData, dabOfficerName: val })}
                    placeholder="نام کارمند مسئول..."
                    className="font-bold text-slate-950"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 shrink-0 w-32">موقف وظیفوی:</span>
                  <EditableField isEditMode={isEditMode}
                    value={formData.dabOfficerTitle || ''}
                    onChange={(val) => setFormData({ ...formData, dabOfficerTitle: val })}
                    placeholder="عنوان وظیفه..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 shrink-0 w-32">ملاحظات اداری:</span>
                  <EditableField isEditMode={isEditMode}
                    value={formData.dabOfficerNotes || ''}
                    onChange={(val) => setFormData({ ...formData, dabOfficerNotes: val })}
                    placeholder="ملاحظات کتبی..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-around border-t md:border-t-0 md:border-r border-slate-300 pt-3 md:pt-0 md:pr-4">
                <div className="text-center">
                  <div className="font-black text-slate-900 mb-2">امضاء و مهر کارمند مسئول:</div>
                  <div className="h-12 w-32 border-b-2 border-dashed border-slate-400 mx-auto"></div>
                </div>

                <div className="text-center">
                  <div className="font-black text-slate-900 mb-2">مهر و تاپه رسمی آمریت:</div>
                  <div className="h-16 w-16 border-2 border-dashed border-slate-400 rounded-full mx-auto flex items-center justify-center text-[9px] text-slate-400 font-bold p-1">
                    تاپه رسمی DAB
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
