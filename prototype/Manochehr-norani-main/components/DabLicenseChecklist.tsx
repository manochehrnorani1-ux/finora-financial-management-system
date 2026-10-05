'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Printer, RotateCcw, Save, Download, 
  Building2, UserCheck, FileCheck, Info, Users, 
  ShieldCheck, Activity, Image as ImageIcon, CheckCircle2, Edit3, Plus, Trash2
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface ChecklistPersonnel {
  id: number;
  position: string;
  name: string;
  fatherName: string;
  idNo: string;
  education: string;
  field: string;
  infoForm: string;
  tin: string;
  criminalInquiry: string;
  sanctions: string;
}

export interface ChecklistData {
  companyName: string;
  licenseNo: string;
  province: string;
  personnel: ChecklistPersonnel[];
  checklistItems: { id: number; text: string; status: string; note: string }[];
  postLicenseObligations: { id: number; subject: string; submitted: string; note: string }[];
}

const DEFAULT_CHECKLIST_DATA: ChecklistData = {
  companyName: 'شرکت صرافی و خدمات پولی برکت الله غفوری',
  licenseNo: 'DAB/7-0965',
  province: 'کندز',
  personnel: [
    { id: 1, position: 'سهمدار', name: 'برکتالله', fatherName: 'عبدالغفور', idNo: '1399-1104-55522', education: 'لیسانس', field: '', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 2, position: 'رئیس هیئت نظار', name: 'بسمالله شیرزی', fatherName: 'دوستمحمد', idNo: '1402-0902-45188', education: 'لیسانس', field: '', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 3, position: 'عضو هیئت نظار', name: 'برکتالله غفوری', fatherName: 'عبدالغفور', idNo: '1399-1104-55522', education: 'لیسانس', field: '', infoForm: '', tin: '9005155800', criminalInquiry: '', sanctions: '' },
    { id: 4, position: 'عضو هیئت نظار', name: 'عظیمالله رحمانی', fatherName: 'محمد آجان', idNo: '1399-1105-35806', education: 'لیسانس', field: '', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 5, position: 'مسئول پیروی از قوانین (Compliance Officer)', name: 'عبدالعزیز مهرزاد', fatherName: '', idNo: '1399-1103-97484', education: 'لیسانس', field: '', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 6, position: 'مسئول عملیاتی', name: 'صالحمحمدرحیمی', fatherName: 'عبدالرحیم', idNo: '1402-0201-48424', education: 'لیسانس', field: '', infoForm: '', tin: '9020613858', criminalInquiry: '', sanctions: '' },
  ],
  checklistItems: [
    { id: 1, text: 'اساسنامه ( با تاپه شرکت و امضای سهمداران)', status: 'ارائه شده', note: '' },
    { id: 2, text: 'رسید پرداخت آویز تضمین: مبلغ 6,600,000 افغانی (کاپی رنگه) در مراکز زونها (کابل، کندهار، هرات، مزار، جلال اباد، کندز و پکتیا) / مبلغ 3,300,000 افغانی (کاپی رنگه) در سایر ولایات', status: 'ارائه شده', note: '' },
    { id: 3, text: 'فورم تضمین سر سهمدار/سهمداران', status: 'ارائه شده', note: '' },
    { id: 4, text: 'پالیسی مبارزه علیه تطهیر پول و تمویل تروریزم (با تاپه شرکت در همه اوراق)', status: 'ارائه شده', note: '' },
    { id: 5, text: 'فورم درخواستی ( شصت و امضا ) توسط سهمداران', status: 'ارائه شده', note: '' },
    { id: 6, text: 'چارت ساختار تشکیلاتی شرکت ( با تاپه شرکت و امضای هیئت نظار)', status: 'ارائه شده', note: '' },
    { id: 7, text: 'فورم بازدید ساحه جهت مناسب بودن محل فعالیت و ارائه معلومات اتحادیه در خصوص ثبت و قرار داد دکان', status: 'ارائه شده', note: '' },
    { id: 8, text: 'دریافت مکتوب عدم باقیداری مالیاتی شرکت و یا مکتوب ترک پیشه از جواز قبلی', status: 'ارائه شده', note: '' },
    { id: 9, text: 'ارائه قرار داد خط ایجاد سیستم نرم افزار و فعال بودن آن قبل از صدور جواز شرکت صرافی و خدمات پولی', status: 'ارائه شده', note: '' },
  ],
  postLicenseObligations: [
    { id: 1, subject: 'ارائه اطلاعیه آغاز فعالیت بعد از دریافت جواز فعالیت صرافی و خدمات پولی', submitted: '', note: '' },
    { id: 2, subject: 'ثبت جواز فعالیت در ریاست ثبت مرکزی و مالکیت های فکری', submitted: '', note: '' },
    { id: 3, subject: 'ارائه سرمایه کاری توسط حساب بانکی: مبلغ 66,600,000 افغانی در ولایت کابل | مبلغ 53,300,000 افغانی در مرکز زونها به استثنی کابل | مبلغ 33,300,000 افغانی در سایر ولایت', submitted: '', note: '' },
    { id: 4, subject: 'ارائه سرمایه کاری توسط حساب بانکی مبلغ 53,300,000 میلیون افغانی در مرکز زونها به استثنی کابل', submitted: '', note: '' },
    { id: 5, subject: 'تایید صورت حساب بانکی بابت ارائه سرمایه کاری', submitted: '', note: '' },
    { id: 6, subject: 'منظوری کارمندان', submitted: '', note: '' },
  ]
};

interface DabLicenseChecklistProps {
  companyId?: string;
  isEditMode?: boolean;
  customLogo?: string | null;
  onOpenLogoModal?: () => void;
  onExportPdf?: () => void;
}

export default function DabLicenseChecklist({ isEditMode: initialEditMode = true, customLogo, onOpenLogoModal, onExportPdf , companyId = "default" }: DabLicenseChecklistProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [data, setData] = useState<ChecklistData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_license_checklist_v5_${companyId}`);
        if (saved) return { ...DEFAULT_CHECKLIST_DATA, ...JSON.parse(saved) };
      } catch (e) { console.error(e); }
    }
    return DEFAULT_CHECKLIST_DATA;
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_license_checklist_v5_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_CHECKLIST_DATA, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_CHECKLIST_DATA);
        }
      } catch (e) { console.error(e); }
    }
    try {
      const docRef = doc(db, 'settings', `license_checklist_v5_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.checklistData) setData(prev => ({ ...prev, ...remoteData.checklistData }));
        }
      });
      return () => unsubscribe();
    } catch (e) { console.warn(e); }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_license_checklist_v5_${companyId}`, JSON.stringify(data));
      const docRef = doc(db, 'settings', `license_checklist_v5_${companyId}`);
      await setDoc(docRef, { checklistData: data, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf({
        elementId: 'license-checklist-canvas',
        filename: `چک_لست_جواز_${data.companyName.replace(/\s+/g, '_')}.pdf`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updatePersonnel = (id: number, field: keyof ChecklistPersonnel, value: string) => {
    setData(prev => ({
      ...prev,
      personnel: prev.personnel.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addPersonnel = () => {
    const newId = Date.now();
    setData(prev => ({
      ...prev,
      personnel: [
        ...prev.personnel,
        {
          id: newId,
          position: 'عضو جدید',
          name: '',
          fatherName: '',
          idNo: '',
          education: 'لیسانس',
          field: '',
          infoForm: '',
          tin: '',
          criminalInquiry: '',
          sanctions: ''
        }
      ]
    }));
  };

  const removePersonnel = (id: number) => {
    if (data.personnel.length <= 1) return;
    setData(prev => ({
      ...prev,
      personnel: prev.personnel.filter(p => p.id !== id)
    }));
  };

  const updateChecklistItem = (id: number, text: string) => {
    setData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map(item => item.id === id ? { ...item, text } : item)
    }));
  };

  const addChecklistItem = () => {
    const newId = Date.now();
    setData(prev => ({
      ...prev,
      checklistItems: [...prev.checklistItems, { id: newId, text: 'عنوان مدرک جدید...', status: 'ارائه شده', note: '' }]
    }));
  };

  const removeChecklistItem = (id: number) => {
    if (data.checklistItems.length <= 1) return;
    setData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.filter(item => item.id !== id)
    }));
  };

  const updateObligation = (id: number, field: 'subject' | 'note', value: string) => {
    setData(prev => ({
      ...prev,
      postLicenseObligations: prev.postLicenseObligations.map(o => o.id === id ? { ...o, [field]: value } : o)
    }));
  };

  const addObligation = () => {
    const newId = Date.now();
    setData(prev => ({
      ...prev,
      postLicenseObligations: [...prev.postLicenseObligations, { id: newId, subject: 'مکلفیت جدید...', submitted: '', note: '' }]
    }));
  };

  const removeObligation = (id: number) => {
    if (data.postLicenseObligations.length <= 1) return;
    setData(prev => ({
      ...prev,
      postLicenseObligations: prev.postLicenseObligations.filter(o => o.id !== id)
    }));
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
            <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">چک لست اسناد و شرایط جواز</h2>
            <p className="text-[10px] text-slate-500">مدیریت و ویرایش کامل تمام فیلدها و جدول‌های چک‌لست رسمی</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isEditing 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'پیش‌نمایش نهایی' : 'ویرایش فرم'}</span>
          </button>

          {isEditing && (
            <button onClick={handleSave} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors">
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />} {isSaved ? 'ذخیره شد' : 'ذخیره در سیستم'}
            </button>
          )}
          {isEditing && (
            <button onClick={() => { if(confirm('بازنشانی به تنظیمات اولیه؟')) setData(DEFAULT_CHECKLIST_DATA); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl" title="بازنشانی">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={handlePdfExport} disabled={isExporting} className="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> {isExporting ? 'در حال تهیه...' : 'خروجی PDF'}
          </button>
          <button onClick={() => window.print()} className="p-2 bg-slate-800 text-white rounded-xl" title="چاپ"><Printer className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Editable Header Fields in Edit Mode */}
      {isEditing && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs print:hidden">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نام شرکت:</label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => setData({ ...data, companyName: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره جواز:</label>
            <input
              type="text"
              value={data.licenseNo}
              onChange={(e) => setData({ ...data, licenseNo: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 font-bold font-mono"
            />
          </div>
        </div>
      )}

      {/* Document Canvas */}
      <div 
        id="license-checklist-canvas"
        className="bg-white text-slate-950 p-8 sm:p-12 border border-slate-200 rounded-2xl shadow-xl max-w-5xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0 font-sans"
      >
        {/* Header */}
        <div className="border-b-4 border-double border-slate-900 pb-6 text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="flex flex-col items-center">
              {customLogo ? (
                <img src={customLogo} alt="Logo" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-14 h-14 bg-blue-900 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-inner">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
            </div>
          </div>
          <div className="text-xs font-black text-blue-900 tracking-wider">
            د افغانستان بانک
          </div>
          <div className="text-[11px] font-bold text-slate-600">
            آمریت عمومی نظارت بر مؤسسات مالی غیر بانکی — مدیریت جوازدهی
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 mt-2">
            چک‌لیست معیاری اسناد و شرایط صدور جواز فعالیت شرکت صرافی و خدمات پولی
          </h1>
          <div className="inline-block bg-amber-50 border border-amber-300 px-6 py-1.5 rounded-full text-xs font-black text-amber-950">
            چک‌لیست اطلاعات شرکت صرافی و خدمات پولی ({data.companyName}) — جواز شماره (<span className="font-mono ltr inline-block">{data.licenseNo}</span>)
          </div>
        </div>

        {/* Section 1: Checklist Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700">اسناد و مدارک چک‌لست:</h3>
            {isEditing && (
              <button onClick={addChecklistItem} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                <Plus className="w-3.5 h-3.5" /> افزودن بند اسناد
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.checklistItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </div>
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-medium"
                    />
                    {data.checklistItems.length > 1 && (
                      <button onClick={() => removeChecklistItem(item.id)} className="text-rose-600 p-1 hover:bg-rose-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 text-[11px] font-bold text-slate-800">{item.text}</div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Personnel Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2 border-r-4 border-blue-900 pr-3 text-blue-900 uppercase">
              جدول مشخصات کادر مدیریتی و عملیاتی
            </h3>
            {isEditing && (
              <button onClick={addPersonnel} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 font-bold flex items-center gap-1 hover:bg-blue-100">
                <Plus className="w-3.5 h-3.5" /> افزودن فرد جدید
              </button>
            )}
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-[10px] text-right border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2 border border-slate-700">موقف در شرکت</th>
                  <th className="p-2 border border-slate-700">اسم</th>
                  <th className="p-2 border border-slate-700">ولد</th>
                  <th className="p-2 border border-slate-700 w-10 text-center">عکس</th>
                  <th className="p-2 border border-slate-700 text-center">شماره تذکره</th>
                  <th className="p-2 border border-slate-700 text-center">سویه تحصیلی</th>
                  <th className="p-2 border border-slate-700 text-center">رشته</th>
                  <th className="p-2 border border-slate-700 text-center">فورم معلومات</th>
                  <th className="p-2 border border-slate-700 text-center">نمبر تشخصیه برویت سند TIN</th>
                  <th className="p-2 border border-slate-700 text-center">استعلام جنائی</th>
                  <th className="p-2 border border-slate-700 text-center">تطبیق تعزیرات</th>
                  {isEditing && <th className="p-2 border border-slate-700 text-center w-8 print:hidden">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold">
                {data.personnel.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-1.5 border border-slate-100 font-black text-slate-950">
                      {isEditing ? (
                        <input type="text" value={p.position} onChange={(e) => updatePersonnel(p.id, 'position', e.target.value)} className="w-full p-1 border rounded text-[10px] font-bold" />
                      ) : p.position}
                    </td>
                    <td className="p-1.5 border border-slate-100 font-bold">
                      {isEditing ? (
                        <input type="text" value={p.name} onChange={(e) => updatePersonnel(p.id, 'name', e.target.value)} className="w-full p-1 border rounded text-[10px]" />
                      ) : p.name}
                    </td>
                    <td className="p-1.5 border border-slate-100">
                      {isEditing ? (
                        <input type="text" value={p.fatherName} onChange={(e) => updatePersonnel(p.id, 'fatherName', e.target.value)} className="w-full p-1 border rounded text-[10px]" />
                      ) : p.fatherName}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      <div className="w-7 h-9 border border-slate-300 rounded bg-slate-100 mx-auto" />
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center font-mono">
                      {isEditing ? (
                        <input type="text" value={p.idNo} onChange={(e) => updatePersonnel(p.id, 'idNo', e.target.value)} className="w-full p-1 border rounded text-[10px] font-mono text-center" />
                      ) : p.idNo}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      {isEditing ? (
                        <input type="text" value={p.education} onChange={(e) => updatePersonnel(p.id, 'education', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : p.education}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      {isEditing ? (
                        <input type="text" value={p.field || ''} onChange={(e) => updatePersonnel(p.id, 'field', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.field || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      {isEditing ? (
                        <input type="text" value={p.infoForm || ''} onChange={(e) => updatePersonnel(p.id, 'infoForm', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.infoForm || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center font-mono">
                      {isEditing ? (
                        <input type="text" value={p.tin || ''} onChange={(e) => updatePersonnel(p.id, 'tin', e.target.value)} className="w-full p-1 border rounded text-[10px] font-mono text-center" />
                      ) : (p.tin || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      {isEditing ? (
                        <input type="text" value={p.criminalInquiry || ''} onChange={(e) => updatePersonnel(p.id, 'criminalInquiry', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.criminalInquiry || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-100 text-center">
                      {isEditing ? (
                        <input type="text" value={p.sanctions || ''} onChange={(e) => updatePersonnel(p.id, 'sanctions', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.sanctions || '-')}
                    </td>
                    {isEditing && (
                      <td className="p-1.5 border border-slate-100 text-center print:hidden">
                        <button onClick={() => removePersonnel(p.id)} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Signature Grid */}
        <div className="grid grid-cols-5 gap-2 pt-8 text-center text-[9px] font-black text-slate-700">
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300 mx-auto w-24"></div>
            <div>امضاء کارمند ولایتی</div>
            <div className="text-[8px] font-normal text-slate-500">(در صورتیکه جواز مربوطه مربوط سایر ولایات باشد)</div>
          </div>
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300 mx-auto w-24"></div>
            <div>امضاء مدیر ارشد زون ساحوی</div>
            <div className="text-[8px] font-normal text-slate-500">(در صورتیکه جواز مربوط مراکز زونها باشد)</div>
          </div>
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300 mx-auto w-24"></div>
            <div>امضاء مدیر جوازدهی</div>
          </div>
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300 mx-auto w-24"></div>
            <div>امضاء مدیر ارشد جوازدهی</div>
          </div>
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300 mx-auto w-24"></div>
            <div>امضاء معاون آمریت</div>
          </div>
        </div>

        {/* Section 4: Post-License Obligations */}
        <div className="space-y-4 pt-10 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2 text-rose-900 border-r-4 border-rose-900 pr-3">
              مکلفیت های بعد از جواز شرکت صرافی و خدمات پولی دارنده جواز شماره ( {data.licenseNo} ):
            </h3>
            {isEditing && (
              <button onClick={addObligation} className="text-xs bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 font-bold flex items-center gap-1 hover:bg-rose-100">
                <Plus className="w-3.5 h-3.5" /> افزودن بند جدید
              </button>
            )}
          </div>
          <div className="overflow-hidden border border-slate-200 rounded-2xl">
            <table className="w-full text-[11px] text-right border-collapse">
              <thead className="bg-slate-50 text-slate-900 font-black">
                <tr>
                  <th className="p-3 border border-slate-200 w-16 text-center">شماره</th>
                  <th className="p-3 border border-slate-200">موضوع</th>
                  <th className="p-3 border border-slate-200 w-32 text-center">ارائه شده یا خیر</th>
                  <th className="p-3 border border-slate-200">ملاحظه</th>
                  {isEditing && <th className="p-3 border border-slate-200 text-center w-8 print:hidden">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {data.postLicenseObligations.map((obj, i) => (
                  <tr key={obj.id} className="hover:bg-slate-50">
                    <td className="p-3 border border-slate-100 text-center">{i + 1}</td>
                    <td className="p-3 border border-slate-100">
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={obj.subject}
                          onChange={(e) => updateObligation(obj.id, 'subject', e.target.value)}
                          className="w-full p-1.5 border rounded text-xs font-bold leading-relaxed"
                        />
                      ) : obj.subject}
                    </td>
                    <td className="p-3 border border-slate-100 text-center">
                      <div className="w-4 h-4 border border-slate-300 rounded mx-auto" />
                    </td>
                    <td className="p-3 border border-slate-100 text-slate-400 font-normal italic">
                      {isEditing ? (
                        <input
                          type="text"
                          value={obj.note}
                          onChange={(e) => updateObligation(obj.id, 'note', e.target.value)}
                          placeholder="ملاحظات..."
                          className="w-full p-1 border rounded text-xs"
                        />
                      ) : (obj.note || 'قید ملاحظه...')}
                    </td>
                    {isEditing && (
                      <td className="p-3 border border-slate-100 text-center print:hidden">
                        <button onClick={() => removeObligation(obj.id)} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
          <span>Official Licensing Form Template</span>
          <span>SUPERVISION/LICENSE-002</span>
          <span>صفحه ۱ از ۱</span>
        </div>
      </div>
    </div>
  );
}
