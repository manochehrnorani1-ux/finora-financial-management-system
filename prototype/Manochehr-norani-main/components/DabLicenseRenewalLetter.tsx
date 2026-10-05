'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Printer, RotateCcw, Save, Edit3, Plus, Trash2, 
  Check, Download, Building2, Stamp, Calendar, Hash, Paperclip, ShieldCheck, UserCheck
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import DabOfficialHeader from './DabOfficialHeader';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface IntroducedMember {
  id: number;
  name: string;
  position: string;
}

export interface IntroducedPersonnelGroup {
  id: number;
  groupTitle: string;
  members: IntroducedMember[];
}

export interface LicenseRenewalLetterData {
  letterNo: string;
  letterDate: string;
  attachment: string;
  recipientTitle: string;
  recipientAttention: string;
  subject: string;
  companyName: string;
  licenseNo: string;
  companyAddressHeader: string;
  mainBodyParagraph1: string;
  mainBodyParagraph2: string;
  personnelGroups: IntroducedPersonnelGroup[];
  closingText: string;
  signatoryName: string;
  signatoryTitle: string;
  companyPhone: string;
}

const DEFAULT_LETTER_DATA: LicenseRenewalLetterData = {
  letterNo: '1405/BG-105',
  letterDate: '1405/02/20',
  attachment: 'ضمیمه فرم‌ها و اسناد',
  recipientTitle: 'به آمریت محترم ساحوی زون شمالشرق !',
  recipientAttention: 'قابل توجه مدیریت محترم نظارت از موسسات مالی و غیر بانکی !',
  subject: 'در مورد تمدید جواز فعالیت شرکت و نمایندگی های آن !',
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  licenseNo: '7-0965',
  companyAddressHeader: 'ولایت کندز، مومند مارکیت، منزل دوم، دکان نمبر 301',
  mainBodyParagraph1: 'محترما : شرکت صرافی و خدمات پولی برکت‌الله غفوری دارنده جواز نمبر 7-0965 واقع مومند مارکیت دوکان نمبر 301 که به تاریخ 1405/03/13 جواز فعالیت شرکت ختم میگردد و به منظور فعالیت و ادامه کار صرافی و خدمات پولی رهبری شرکت تصمیم دارد جواز فعالیت مرکزی و نمایندگی های خویش را تمدید نماید در زمینه همکاری نموده ممنون سازید .',
  mainBodyParagraph2: 'سهم داران شرکت پس از بحث و بررسی و فیصله نهایی افراد ذیل را به عنوان کارمندان و نماینده رسمی شرکت معرفی مینمایند .',
  personnelGroups: [
    {
      id: 1,
      groupTitle: 'کارمندان دفتر مرکزی:',
      members: [
        { id: 1, name: 'برکت‌الله غفوری', position: 'رئیس و سهمدار اصلی' },
        { id: 2, name: 'بسم‌الله شیرزی', position: 'رئیس هیئت نظار' },
        { id: 3, name: 'برکت‌الله غفوری', position: 'عضو هیئت نظار' },
        { id: 4, name: 'عظیم‌الله رحمانی', position: 'عضو هیئت نظار' },
        { id: 5, name: 'صالح‌محمد', position: 'مسئول عملیاتی' },
        { id: 6, name: 'عبدالعزیز مهرزاد', position: 'مسئول پیروی از قوانین (Compliance Officer)' },
      ]
    },
    {
      id: 2,
      groupTitle: 'معرفی نماینده و کارمندان نمایندگی تخار:',
      members: [
        { id: 1, name: 'رحمت‌الله', position: 'نماینده' },
        { id: 2, name: 'عبیدالله', position: 'خزانه‌دار' },
      ]
    },
    {
      id: 3,
      groupTitle: 'معرفی نماینده و کارمندان نمایندگی کابل:',
      members: [
        { id: 1, name: 'اجمل احمدی', position: 'نماینده' },
        { id: 2, name: 'ریحان', position: 'عضو نمایندگی' },
        { id: 3, name: 'صدیق‌الله', position: 'منشی و خزانه‌دار' },
      ]
    },
    {
      id: 4,
      groupTitle: 'معرفی نماینده و کارمندان نمایندگی امام‌صاحب:',
      members: [
        { id: 1, name: 'محمدیوسف', position: 'نماینده' },
        { id: 2, name: 'عبدالمجید', position: 'خزانه‌دار' },
      ]
    },
    {
      id: 5,
      groupTitle: 'معرفی نماینده و کارمندان نمایندگی کشم، بدخشان:',
      members: [
        { id: 1, name: 'عتیق‌الله', position: 'نماینده' },
      ]
    }
  ],
  closingText: 'غرض اجرات بعدی به شما معرفی گردید.',
  signatoryName: 'صالح‌محمد',
  signatoryTitle: 'مسئول عملیاتی شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  companyPhone: '0799681111 / 0749340000'
};

interface DabLicenseRenewalLetterProps {
  companyId?: string;
  isEditMode?: boolean;
  customLogo?: string | null;
  onOpenLogoModal?: () => void;
  onExportPdf?: () => void;
}

export default function DabLicenseRenewalLetter({ isEditMode = true, customLogo, onOpenLogoModal, onExportPdf, companyId = 'default' }: DabLicenseRenewalLetterProps) {
  const [data, setData] = useState<LicenseRenewalLetterData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_dab_license_renewal_letter_v2_${companyId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_LETTER_DATA, ...parsed };
        }
      } catch (e) {
        console.error('Failed to load letter data from localStorage:', e);
      }
    }
    return DEFAULT_LETTER_DATA;
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Firestore Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_dab_license_renewal_letter_v2_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_LETTER_DATA, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_LETTER_DATA);
        }
      } catch (e) {
        console.error('Failed to load letter data from localStorage:', e);
      }
    }
    try {
      const docRef = doc(db, 'settings', `license_renewal_letter_v2_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData && remoteData.letterData) {
            setData((prev) => ({ ...prev, ...remoteData.letterData }));
          }
        }
      }, (err) => {
        console.warn('Firestore subscription info:', err.message);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore offline fallback:', e);
    }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_dab_license_renewal_letter_v2_${companyId}`, JSON.stringify(data));
      
      try {
        const docRef = doc(db, 'settings', `license_renewal_letter_v2_${companyId}`);
        await setDoc(docRef, {
          letterData: data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save letter:', e);
    }
  };

  const handleReset = () => {
    if (window.confirm('آیا از بازنشانی مکتوب تمدید جواز به متن دقیق سند رسمی اطمینان دارید؟')) {
      setData(DEFAULT_LETTER_DATA);
      localStorage.removeItem(`bg_dab_license_renewal_letter_v2_${companyId}`);
    }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf({
        elementId: 'dab-license-renewal-letter-canvas',
        filename: 'مکتوب_رسمی_تمدید_جواز_برکت_الله_غفوری_DAB.pdf',
        orientation: 'portrait'
      });
    } catch (error) {
      console.error('Error exporting letter PDF:', error);
      alert('خطا در دانلود فایل PDF مکتوب. لطفا مجددا تلاش کنید.');
    } finally {
      setIsExporting(false);
    }
  };

  // Group Management Functions
  const handleMemberChange = (groupIdx: number, memberIdx: number, field: 'name' | 'position', val: string) => {
    const updatedGroups = [...data.personnelGroups];
    updatedGroups[groupIdx].members[memberIdx][field] = val;
    setData({ ...data, personnelGroups: updatedGroups });
  };

  const addMember = (groupIdx: number) => {
    const updatedGroups = [...data.personnelGroups];
    const newId = updatedGroups[groupIdx].members.length + 1;
    updatedGroups[groupIdx].members.push({ id: newId, name: 'نام کارمند', position: 'سمت شغلی' });
    setData({ ...data, personnelGroups: updatedGroups });
  };

  const removeMember = (groupIdx: number, memberIdx: number) => {
    const updatedGroups = [...data.personnelGroups];
    if (updatedGroups[groupIdx].members.length <= 1) return;
    updatedGroups[groupIdx].members = updatedGroups[groupIdx].members.filter((_, i) => i !== memberIdx);
    setData({ ...data, personnelGroups: updatedGroups });
  };

  const addPersonnelGroup = () => {
    const newId = data.personnelGroups.length + 1;
    setData({
      ...data,
      personnelGroups: [
        ...data.personnelGroups,
        {
          id: newId,
          groupTitle: 'معرفی نماینده و کارمندان نمایندگی جدید:',
          members: [{ id: 1, name: 'نام نماینده', position: 'نماینده' }]
        }
      ]
    });
  };

  const removePersonnelGroup = (groupIdx: number) => {
    if (data.personnelGroups.length <= 1) return;
    const updated = data.personnelGroups.filter((_, i) => i !== groupIdx);
    setData({ ...data, personnelGroups: updated });
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Control Action Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Stamp className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>مکتوب رسمی درخواست تمدید جواز و نمایندگی‌ها (د افغانستان بانک)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            نسخه دقیق مکتوب رسمی صادر شده به آمریت محترم ساحوی زون شمالشرق د افغانستان بانک
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditMode && (
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'ذخیره شد' : 'ذخیره مکتوب'}</span>
            </button>
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
              title="پاکسازی / بازنشانی"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePdfExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'در حال خروجی PDF...' : 'دانلود PDF رسمی'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="چاپ مستقیم"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">چاپ</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
            title="بازنشانی به متن مکتوب اصلی"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editing Form Section */}
      {isEditMode && (
        <div className="bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200 print:hidden shadow-xs">
          <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2 border-b border-amber-200 dark:border-slate-700 pb-3">
            <Edit3 className="w-4 h-4" />
            <span>ویرایش مشخصات و متن مکتوب رسمی</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold block mb-1">شماره مکتوب:</label>
              <input
                type="text"
                value={data.letterNo}
                onChange={(e) => setData({ ...data, letterNo: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">تاریخ مکتوب:</label>
              <input
                type="text"
                value={data.letterDate}
                onChange={(e) => setData({ ...data, letterDate: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">شماره جواز:</label>
              <input
                type="text"
                value={data.licenseNo}
                onChange={(e) => setData({ ...data, licenseNo: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold block mb-1">عنوان مرجع دریافت‌کننده:</label>
              <input
                type="text"
                value={data.recipientTitle}
                onChange={(e) => setData({ ...data, recipientTitle: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">قسمت توجه:</label>
              <input
                type="text"
                value={data.recipientAttention}
                onChange={(e) => setData({ ...data, recipientAttention: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">موضوع مکتوب:</label>
            <input
              type="text"
              value={data.subject}
              onChange={(e) => setData({ ...data, subject: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">متن اصلی درخواست تمدید (بند اول):</label>
            <textarea
              rows={3}
              value={data.mainBodyParagraph1}
              onChange={(e) => setData({ ...data, mainBodyParagraph1: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">متن معرفی کارمندان (بند دوم):</label>
            <textarea
              rows={2}
              value={data.mainBodyParagraph2}
              onChange={(e) => setData({ ...data, mainBodyParagraph2: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed"
            />
          </div>

          {/* Edit Introduced Personnel & Branches */}
          <div className="space-y-4 pt-2 border-t border-amber-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="font-black text-sm text-slate-900 dark:text-white">فهرست کارمندان و نمایندگی‌های معرفی شده:</label>
              <button
                type="button"
                onClick={addPersonnelGroup}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن نمایندگی / بخش جدید</span>
              </button>
            </div>

            {data.personnelGroups.map((group, gIdx) => (
              <div key={group.id} className="bg-white dark:bg-slate-900 p-3.5 border border-slate-300 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={group.groupTitle}
                    onChange={(e) => {
                      const updated = [...data.personnelGroups];
                      updated[gIdx].groupTitle = e.target.value;
                      setData({ ...data, personnelGroups: updated });
                    }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => addMember(gIdx)}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>عضو</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removePersonnelGroup(gIdx)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                    title="حذف گروه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 pr-2 border-r-2 border-amber-400">
                  {group.members.map((m, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400 w-4">{mIdx + 1}.</span>
                      <input
                        type="text"
                        value={m.name}
                        placeholder="نام کارمند"
                        onChange={(e) => handleMemberChange(gIdx, mIdx, 'name', e.target.value)}
                        className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                      <input
                        type="text"
                        value={m.position}
                        placeholder="سمت"
                        onChange={(e) => handleMemberChange(gIdx, mIdx, 'position', e.target.value)}
                        className="w-40 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(gIdx, mIdx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-bold block mb-1">نام مسئول امضاءکننده:</label>
              <input
                type="text"
                value={data.signatoryName}
                onChange={(e) => setData({ ...data, signatoryName: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">سمت مسئول امضاءکننده:</label>
              <input
                type="text"
                value={data.signatoryTitle}
                onChange={(e) => setData({ ...data, signatoryTitle: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Printable / Viewable Official Letter Canvas */}
      <div 
        id="dab-license-renewal-letter-canvas"
        className="bg-white text-slate-950 p-6 sm:p-10 border border-slate-300 rounded-2xl shadow-sm text-sm print:border-none print:shadow-none print:p-0 print:m-0 max-w-4xl mx-auto space-y-6 relative font-sans leading-relaxed dir-rtl"
      >
        
        {/* Letter Official Header Matching Official DAB Standard */}
        <DabOfficialHeader
          storageKey={`dab_letter_${companyId}`}
          governmentTitle="امارت اسلامی افغانستان"
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت بر مؤسسات مالی غیر بانکی"
          directorate="مدیریت عمومی نظارت و بررسی صرافی‌ها"
          formTitle="مکتوب رسمی تقاضای تمدید جواز فعالیت مرکز و نمایندگی‌ها"
          serialNo={data.letterNo}
          letterDate={data.letterDate}
          attachments="اسناد و ضمایم مندرجه"
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={true}
        />

        {/* Recipient Section */}
        <div className="space-y-1.5 text-xs sm:text-sm font-extrabold text-slate-900">
          <div className="text-blue-950 text-sm sm:text-base font-black">
            {data.recipientTitle}
          </div>
          <div className="text-slate-800 font-bold">
            {data.recipientAttention}
          </div>
          <div className="text-slate-950 font-black pt-1">
            {data.subject}
          </div>
        </div>

        {/* Main Body Paragraphs */}
        <div className="space-y-3 text-xs sm:text-sm text-slate-900 leading-loose text-justify font-semibold">
          <p className="whitespace-pre-line">
            {data.mainBodyParagraph1}
          </p>

          <p className="whitespace-pre-line pt-1">
            {data.mainBodyParagraph2}
          </p>
        </div>

        {/* Personnel & Branch Groups (Exact formatting from document) */}
        <div className="space-y-4 my-4">
          {data.personnelGroups.map((group) => (
            <div key={group.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm print:bg-transparent print:border-none print:p-0">
              <h4 className="font-black text-slate-950 mb-2 border-b border-slate-300 pb-1 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-900 shrink-0 print:hidden" />
                <span>{group.groupTitle}</span>
              </h4>

              <ol className="space-y-1.5 pr-4 text-slate-900 font-bold">
                {group.members.map((m, idx) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="font-black text-slate-600">{idx + 1}.</span>
                    <span className="font-extrabold text-slate-950">{m.name}</span>
                    <span className="text-slate-700 font-medium">بحیث {m.position}.</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Closing Paragraph */}
        <div className="text-xs sm:text-sm font-bold text-slate-900 pt-2">
          {data.closingText}
        </div>

        {/* Footer info bar */}
        <div className="pt-4 border-t border-slate-300 text-center text-[10px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>آدرس: کندز، مومند مارکیت، دکان ۳۰۱</span>
          <span>ارسال شده به: آمریت محترم ساحوی زون شمالشرق DAB</span>
          <span>صفحه رسمی مکتوب تمدید جواز</span>
        </div>

      </div>
    </div>
  );
}
