'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Printer, RotateCcw, Save, Download, 
  Building2, UserCheck, FileCheck, Info, Users, 
  ShieldCheck, Activity, Image as ImageIcon, CheckCircle2, Edit3, Plus, Trash2, Check, RefreshCw
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import DabOfficialHeader from './DabOfficialHeader';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface RenewalPersonnel {
  id: number;
  position: string;
  name: string;
  fatherName: string;
  idNo: string;
  education: string;
  field?: string;
  statusType: 'سابقه' | 'جدید'; // sabaqa or jadeed
  infoForm?: string;
  tin?: string;
  criminalInquiry?: string;
  sanctions?: string;
}

export interface RenewalChecklistItem {
  id: number;
  text: string;
  status: 'ارائه شده' | 'تایید شده' | 'عدم ارائه';
  note?: string;
}

export interface RenewalChecklistData {
  companyName: string;
  licenseNo: string;
  province: string;
  dateStr: string;
  personnel: RenewalPersonnel[];
  checklistItems: RenewalChecklistItem[];
}

const DEFAULT_RENEWAL_CHECKLIST_DATA: RenewalChecklistData = {
  companyName: 'شرکت صرافی و خدمات پولی برکت الله غفوری',
  licenseNo: 'DAB/7-0965',
  province: 'کندز',
  dateStr: '1404/01/01',
  personnel: [
    { id: 1, position: 'سهمدار', name: 'برکتالله', fatherName: 'عبدالغفور', idNo: '1399-1104-55522', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 2, position: 'رئیس هیئت نظار', name: 'بسمالله شیرزی', fatherName: 'دوستمحمد', idNo: '1402-0902-45188', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 3, position: 'عضو هیئت نظار', name: 'برکتالله غفوری', fatherName: 'عبدالغفور', idNo: '1399-1104-55522', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '9005155800', criminalInquiry: '', sanctions: '' },
    { id: 4, position: 'عضو هیئت نظار', name: 'عظیمالله رحمانی', fatherName: 'محمد آجان', idNo: '1399-1105-35806', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 5, position: 'مسئول پیروی از قوانین (Compliance Officer)', name: 'عبدالعزیز مهرزاد', fatherName: '', idNo: '1399-1103-97484', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '', criminalInquiry: '', sanctions: '' },
    { id: 6, position: 'مسئول عملیاتی', name: 'صالحمحمدرحیمی', fatherName: 'عبدالرحیم', idNo: '1402-0201-48424', education: 'لیسانس', field: '', statusType: 'سابقه', infoForm: '', tin: '9020613858', criminalInquiry: '', sanctions: '' },
  ],
  checklistItems: [
    { id: 1, text: 'فورم درخواستی ( شصت و امضا ) و صورت جلسه سهمداران برای تمدید جواز', status: 'ارائه شده', note: '' },
    { id: 2, text: 'اصل جواز فعالیت', status: 'ارائه شده', note: '' },
    { id: 3, text: 'اطمینان در خصوص عدم مسئولیت نظارتی و راپوردهی (فنتراکا)', status: 'ارائه شده', note: '' },
    { id: 4, text: 'رسید پرداخت آویز تضمین: مبلغ 6,600,000 افغانی (کاپی رنگه) در مراکز زونها (کابل، کندهار، هرات، مزار، جلال اباد، کندز و پکتیا) / مبلغ 3,300,000 افغانی (کاپی رنگه) در سایر ولایات', status: 'ارائه شده', note: '' },
    { id: 5, text: 'فورم تضمین سر سهمدار/سهمداران', status: 'ارائه شده', note: '' },
    { id: 6, text: 'پاسخ استعلام اتحادیه در ارتباط به مسئولیت و عدم مسئولیت شرکت', status: 'ارائه شده', note: '' },
    { id: 7, text: 'چارت ساختار تشکیلاتی شرکت ( با تاپه شرکت و امضای هیئت نظار) و اساسنامه', status: 'ارائه شده', note: '' },
    { id: 8, text: 'دریافت مکتوب عدم باقیداری مالیاتی شرکت', status: 'ارائه شده', note: '' },
    { id: 9, text: 'ارائه سرمایه کاری توسط حساب بانکی: مبلغ 30,000,000 افغانی در مراکز زونها کابل / مبلغ 10,000,000 افغانی در سایر ولایت', status: 'ارائه شده', note: '' },
    { id: 10, text: 'تایید صورت حساب بانکی بابت ارائه سرمایه کاری', status: 'ارائه شده', note: '' },
  ]
};

interface DabLicenseRenewalChecklistProps {
  companyId?: string;
  isEditMode?: boolean;
  customLogo?: string | null;
  onOpenLogoModal?: () => void;
  onExportPdf?: () => void;
}

export default function DabLicenseRenewalChecklist({ isEditMode: initialEditMode = true, customLogo, onOpenLogoModal, onExportPdf , companyId = "default" }: DabLicenseRenewalChecklistProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [data, setData] = useState<RenewalChecklistData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_license_renewal_checklist_v1_${companyId}`);
        if (saved) return { ...DEFAULT_RENEWAL_CHECKLIST_DATA, ...JSON.parse(saved) };
      } catch (e) { console.error(e); }
    }
    return DEFAULT_RENEWAL_CHECKLIST_DATA;
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_license_renewal_checklist_v1_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_RENEWAL_CHECKLIST_DATA, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_RENEWAL_CHECKLIST_DATA);
        }
      } catch (e) { console.error(e); }
    }
    try {
      const docRef = doc(db, 'settings', `license_renewal_checklist_v1_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.checklistData) {
            setData(prev => ({ ...prev, ...remoteData.checklistData }));
          }
        }
      });
      return () => unsubscribe();
    } catch (e) { console.warn(e); }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_license_renewal_checklist_v1_${companyId}`, JSON.stringify(data));
      const docRef = doc(db, 'settings', `license_renewal_checklist_v1_${companyId}`);
      await setDoc(docRef, { checklistData: data, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const updatePersonnel = (id: number, field: keyof RenewalPersonnel, value: any) => {
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
          statusType: 'جدید',
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
      checklistItems: [...prev.checklistItems, { id: newId, text: 'شرط یا اسناد جدید...', status: 'ارائه شده', note: '' }]
    }));
  };

  const removeChecklistItem = (id: number) => {
    if (data.checklistItems.length <= 1) return;
    setData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.filter(item => item.id !== id)
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (onExportPdf) {
      onExportPdf();
    } else {
      exportElementToPdf({
        elementId: 'dab-license-renewal-checklist-canvas',
        filename: `چک_لست_تمدید_جواز_${data.companyName.replace(/\s+/g, '_')}.pdf`,
        orientation: 'portrait'
      });
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">چک لست اسناد و شرایط برای تمدید جواز فعالیت</h2>
            <p className="text-[10px] text-slate-500">مدیریت و ویرایش کامل چک‌لست تمدید جواز شرکت صرافی و خدمات پولی</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <button onClick={() => { if(confirm('بازنشانی به تنظیمات اولیه؟')) setData(DEFAULT_RENEWAL_CHECKLIST_DATA); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl" title="بازنشانی">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button onClick={handleExportPdf} className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Download className="w-4 h-4" /> PDF
          </button>

          <button onClick={handlePrint} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Printer className="w-4 h-4" /> چاپ
          </button>
        </div>
      </div>

      {/* Editable Header Fields in Edit Mode */}
      {isEditing && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs print:hidden">
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
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ولایت:</label>
            <input
              type="text"
              value={data.province}
              onChange={(e) => setData({ ...data, province: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 font-bold"
            />
          </div>
        </div>
      )}

      {/* Document Canvas */}
      <div 
        id="dab-license-renewal-checklist-canvas"
        className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-xl space-y-8 font-sans print:shadow-none print:border-none print:p-0"
      >
        {/* Official Header */}
        <DabOfficialHeader
          storageKey={`license_renewal_checklist_${companyId}`}
          governmentTitle="امارت اسلامی افغانستان"
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت بر مؤسسات مالی غیر بانکی"
          directorate="مدیریت جوازدهی صرافی‌ها و خدمات پولی"
          formNumber=""
          formTitle="چک‌لیست معیاری اسناد و شرایط تمدید جواز فعالیت (دفتر مرکزی)"
          companyName={data.companyName}
          licenseNo={data.licenseNo}
          guidelineText={`چک‌لیست بررسی اسناد شرکت صرافی و خدمات پولی (${data.companyName}) — جواز شماره (${data.licenseNo}) واقع ولایت (${data.province})`}
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={true}
        />

        {/* Section 1: Checklist Grid (10 Official Items for Renewal) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 border-r-4 border-emerald-700 pr-3 uppercase">
              جدول اسناد و مدارک الزامی تمدید جواز:
            </h3>
            {isEditing && (
              <button onClick={addChecklistItem} className="text-xs text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                <Plus className="w-3.5 h-3.5" /> افزودن بند اسناد
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.checklistItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 bg-emerald-800 text-white rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                {isEditing ? (
                  <div className="flex-1 space-y-1">
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-medium"
                    />
                    {data.checklistItems.length > 1 && (
                      <button onClick={() => removeChecklistItem(item.id)} className="text-rose-600 text-[10px] font-bold flex items-center gap-0.5 hover:underline">
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 text-[11px] font-bold text-slate-800 leading-snug">
                    {item.text}
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <div className="w-5 h-5 border-2 border-emerald-700 rounded flex items-center justify-center bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Personnel Table (With 12 Standard Columns + New/Existing Toggle) */}
        <div className="space-y-3 pt-6 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2 border-r-4 border-blue-900 pr-3 text-blue-950 uppercase">
              جدول مشخصات کادر مدیریتی و عملیاتی (تمدید جواز)
            </h3>
            {isEditing && (
              <button onClick={addPersonnel} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 font-bold flex items-center gap-1 hover:bg-blue-100">
                <Plus className="w-3.5 h-3.5" /> افزودن فرد جدید
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-2xl shadow-xs">
            <table className="w-full text-[10px] text-right border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2 border border-slate-700 text-center">موقف در شرکت</th>
                  <th className="p-2 border border-slate-700 text-center">اسم</th>
                  <th className="p-2 border border-slate-700 text-center">ولد</th>
                  <th className="p-2 border border-slate-700 text-center w-10">عکس</th>
                  <th className="p-2 border border-slate-700 text-center">شماره تذکره</th>
                  <th className="p-2 border border-slate-700 text-center">سویه تحصیلی</th>
                  <th className="p-2 border border-slate-700 text-center">رشته</th>
                  <th className="p-2 border border-slate-700 text-center min-w-[90px]">سهمدار/کارمندان</th>
                  <th className="p-2 border border-slate-700 text-center">فورم معلومات</th>
                  <th className="p-2 border border-slate-700 text-center">نمبر تشخصیه (TIN)</th>
                  <th className="p-2 border border-slate-700 text-center">استعلام جنائی</th>
                  <th className="p-2 border border-slate-700 text-center">تطبیق تعزیرات</th>
                  {isEditing && <th className="p-2 border border-slate-700 text-center w-8 print:hidden">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {data.personnel.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-1.5 border border-slate-200 font-black text-slate-950">
                      {isEditing ? (
                        <input type="text" value={p.position} onChange={(e) => updatePersonnel(p.id, 'position', e.target.value)} className="w-full p-1 border rounded text-[10px] font-bold" />
                      ) : p.position}
                    </td>
                    <td className="p-1.5 border border-slate-200 font-bold">
                      {isEditing ? (
                        <input type="text" value={p.name} onChange={(e) => updatePersonnel(p.id, 'name', e.target.value)} className="w-full p-1 border rounded text-[10px]" />
                      ) : p.name}
                    </td>
                    <td className="p-1.5 border border-slate-200">
                      {isEditing ? (
                        <input type="text" value={p.fatherName} onChange={(e) => updatePersonnel(p.id, 'fatherName', e.target.value)} className="w-full p-1 border rounded text-[10px]" />
                      ) : p.fatherName}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      <div className="w-7 h-9 border border-slate-300 rounded bg-slate-100 mx-auto" />
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">
                      {isEditing ? (
                        <input type="text" value={p.idNo} onChange={(e) => updatePersonnel(p.id, 'idNo', e.target.value)} className="w-full p-1 border rounded text-[10px] font-mono text-center" />
                      ) : p.idNo}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      {isEditing ? (
                        <input type="text" value={p.education} onChange={(e) => updatePersonnel(p.id, 'education', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : p.education}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      {isEditing ? (
                        <input type="text" value={p.field || ''} onChange={(e) => updatePersonnel(p.id, 'field', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.field || '-')}
                    </td>
                    
                    {/* Status Type Column: جدید / سابقه */}
                    <td className="p-1.5 border border-slate-200 text-center font-bold">
                      {isEditing ? (
                        <select
                          value={p.statusType || 'سابقه'}
                          onChange={(e) => updatePersonnel(p.id, 'statusType', e.target.value as any)}
                          className="w-full p-1 border rounded text-[10px] bg-white font-bold text-center"
                        >
                          <option value="سابقه">سابقه</option>
                          <option value="جدید">جدید</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.statusType === 'جدید' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {p.statusType || 'سابقه'}
                        </span>
                      )}
                    </td>

                    <td className="p-1.5 border border-slate-200 text-center">
                      {isEditing ? (
                        <input type="text" value={p.infoForm || ''} onChange={(e) => updatePersonnel(p.id, 'infoForm', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.infoForm || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center font-mono">
                      {isEditing ? (
                        <input type="text" value={p.tin || ''} onChange={(e) => updatePersonnel(p.id, 'tin', e.target.value)} className="w-full p-1 border rounded text-[10px] font-mono text-center" />
                      ) : (p.tin || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      {isEditing ? (
                        <input type="text" value={p.criminalInquiry || ''} onChange={(e) => updatePersonnel(p.id, 'criminalInquiry', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.criminalInquiry || '-')}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-center">
                      {isEditing ? (
                        <input type="text" value={p.sanctions || ''} onChange={(e) => updatePersonnel(p.id, 'sanctions', e.target.value)} className="w-full p-1 border rounded text-[10px] text-center" />
                      ) : (p.sanctions || '-')}
                    </td>
                    {isEditing && (
                      <td className="p-1.5 border border-slate-200 text-center print:hidden">
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

        {/* Section 3: Official 5 Signature Columns */}
        <div className="pt-12 border-t-2 border-slate-300 space-y-6">
          <h3 className="text-xs font-black text-slate-700 text-center uppercase tracking-wider">
            بخش تأییدیه و امضائات هیئت ارزیابی و مدیران آمریت
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-[10px] font-bold">
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
              <p className="text-slate-700 leading-snug">امضاء کارمند ولایتی<br/><span className="text-[9px] font-normal text-slate-500">(در صورتیکه جواز یاد شده مربوط سایر ولایات باشد)</span></p>
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">امضاء / تاریخ</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
              <p className="text-slate-700 leading-snug">امضاء مدیر ارشد زون ساحوی<br/><span className="text-[9px] font-normal text-slate-500">(در صورتیکه جواز مربوط مراکز زونها باشد)</span></p>
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">امضاء / تاریخ</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
              <p className="text-slate-700 leading-snug">امضاء مدیر جوازدهی</p>
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">امضاء / تاریخ</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
              <p className="text-slate-700 leading-snug">امضاء مدیر ارشد جوازدهی</p>
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">امضاء / تاریخ</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
              <p className="text-slate-700 leading-snug">امضاء معاون آمریت</p>
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">امضاء / تاریخ</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 text-center text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
          <span>د افغانستان بانک - مدیریت عمومی جوازدهی صرافی و خدمات پولی</span>
          <span>صفحه ۱ از ۱ • سند تمدید جواز</span>
        </div>
      </div>
    </div>
  );
}
