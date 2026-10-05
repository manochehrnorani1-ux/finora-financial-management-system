'use client';
import { toEnglishDigits } from '@/lib/utils';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Printer, RotateCcw, Save, Edit3, Plus, Trash2, 
  Check, Download, Building2, Users, Calendar, Clock, MapPin, 
  UserCheck, ClipboardList, CheckSquare, FileCode
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import { exportElementToWord } from '@/lib/wordExport';
import DabOfficialHeader from './DabOfficialHeader';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface Participant {
  id: number;
  name: string;
  position: string;
  idNo: string;
}

export interface MeetingAgendaItem {
  id: number;
  text: string;
}

export interface MeetingDecision {
  id: number;
  text: string;
}

export interface MeetingMinutesData {
  meetingNo: string;
  meetingDate: string;
  location: string;
  heldDate: string;
  heldTime: string;
  companyName: string;
  previousCompanyName?: string;
  licenseNo: string;
  companyAddress: string;
  participants: Participant[];
  agenda: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  closingStatement: string;
}

const DEFAULT_MEETING_DATA: MeetingMinutesData = {
  meetingNo: '1405/MM-101',
  meetingDate: '1405/02/15',
  location: 'مومند مارکیت، منزل 2، دکان 301، ولایت کندز',
  heldDate: '1405/02/15',
  heldTime: '10:00 AM (قبل از ظهر)',
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری (سهامی خاص)',
  previousCompanyName: 'شرکت صرافی و خدمات پولی ستاره آسیا',
  licenseNo: 'DAB/7-0965',
  companyAddress: 'ولایت کندز، مومند مارکیت، منزل 2، دکان نمبر 301',
  participants: [
    { id: 1, name: 'برکت‌الله ولد عبدالغفور', position: 'سهمدار اصلی، مالک 100٪ سرمایه و رئیس مجمع', idNo: '55522-1104-1001399' },
    { id: 2, name: 'بسم‌الله شیرزی', position: 'رئیس جدید هیئت نظار', idNo: '34210-0201-0087654' },
    { id: 3, name: 'برکت‌الله غفوری', position: 'عضو هیئت نظار و نماینده سهمداران', idNo: '55522-1104-1001399' },
    { id: 4, name: 'عظیم‌الله رحمانی', position: 'عضو هیئت نظار و مشاور حقوقی', idNo: '12980-1504-0054321' },
    { id: 5, name: 'اجمل احمدی', position: 'نماینده جدید و رسمی شعبه کابل', idNo: '43210-1101-0065432' },
    { id: 6, name: 'حبیب‌الرحمن غفوری', position: 'سهمدار سابق (انتقال‌دهنده سهم)', idNo: '98712-1104-0043215' },
    { id: 7, name: 'بقیت‌الله', position: 'رئیس سابق هیئت نظار (مستعفی)', idNo: '65431-1201-0098761' },
  ],
  agenda: [
    { id: 1, text: '1. انتقال و واگذاری کلیه اسهام و سرمایه محترم حبیب‌الرحمن غفوری به محترم برکت‌الله غفوری (تثبیت 100٪ اسهام).' },
    { id: 2, text: '2. تغییر نام رسمی شرکت از «شرکت صرافی و خدمات پولی ستاره آسیا» به «شرکت صرافی و خدمات پولی برکت‌الله غفوری».' },
    { id: 3, text: '3. تغییر و تعیین نماینده رسمی شعبه کابل از محترم برکت‌الله غفوری به محترم اجمل احمدی.' },
    { id: 4, text: '4. تغییر و تعیین رئیس هیئت نظار شرکت از محترم بقیت‌الله به محترم بسم‌الله شیرزی.' },
    { id: 5, text: '5. تمدید جواز فعالیت مرکز صرافی و 4 نمایندگی تابعه در د افغانستان بانک (DAB).' },
    { id: 6, text: '6. ارزیابی انطباق با قوانین مبارزه با پولشویی و عواید ناشی از جرایم (AML/CFT).' },
  ],
  decisions: [
    { id: 1, text: 'انتقال سهم: با موافقت تمامی اعضاء، 100٪ اسهام محترم حبیب‌الرحمن غفوری رسماً و شرعاً به محترم برکت‌الله غفوری انتقال یافت و ایشان مالک انحصاری 100٪ سرمایه شرکت شناخته شدند.' },
    { id: 2, text: 'تغییر اسم شرکت: تغییر نام شرکت از «شرکت صرافی و خدمات پولی ستاره آسیا» به «شرکت صرافی و خدمات پولی برکت‌الله غفوری» به اتفاق آراء تصویب گردید تا در د افغانستان بانک و مراجع ذیربط رسماً ثبت گردد.' },
    { id: 3, text: 'تغییر نماینده کابل: محترم اجمل احمدی رسماً به عنوان نماینده و مسئول اجرایی شعبه کابل به جای محترم برکت‌الله غفوری تعیین و مکلف به پیشبرد کلیه امور نمایندگی کابل گردید.' },
    { id: 4, text: 'تغییر رئیس هیئت نظار: با پذیرش استعفای محترم بقیت‌الله، محترم بسم‌الله شیرزی با اتفاق آراء به عنوان رئیس جدید هیئت نظار شرکت انتخاب و منصوب گردید.' },
    { id: 5, text: 'تمدید جوازها: تمدید جواز فعالیت مرکز و کلیه 4 نمایندگی ولایتی (کابل، تخار، کشم، امام صاحب) برای دوره جدید تصویب و مدیر عملیاتی جهت طی مراحل اداری در DAB توظیف شد.' },
  ],
  closingStatement: 'جلسه در فضای تفاهم کامل و با رعایت تمامی احکام قانون صرافی‌ها و خدمات پولی د افغانستان بانک خاتمه یافت. این صورتجلسه در 4 ماده اصلی و بندهای تکمیلی تنظیم گردیده و به امضاء و مهر رسمی حاضرین رسید.'
};

interface MeetingMinutesProps {
  companyId?: string;
  isEditMode?: boolean;
  customLogo?: string | null;
  onOpenLogoModal?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
}

export default function MeetingMinutes({ 
  isEditMode = true, 
  customLogo, 
  onOpenLogoModal, 
  onExportPdf, 
  onExportWord,
  companyId = "default" 
}: MeetingMinutesProps) {
  const [data, setData] = useState<MeetingMinutesData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_meeting_minutes_v2_${companyId}`);
        if (saved) return { ...DEFAULT_MEETING_DATA, ...JSON.parse(saved) };
      } catch (e) { console.error(e); }
    }
    return DEFAULT_MEETING_DATA;
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_meeting_minutes_v2_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_MEETING_DATA, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_MEETING_DATA);
        }
      } catch (e) { console.error(e); }
    }
    try {
      const docRef = doc(db, 'settings', `meeting_minutes_v2_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.meetingData) setData(prev => ({ ...prev, ...remoteData.meetingData }));
        }
      });
      return () => unsubscribe();
    } catch (e) { console.warn(e); }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_meeting_minutes_v2_${companyId}`, JSON.stringify(data));
      const docRef = doc(db, 'settings', `meeting_minutes_v2_${companyId}`);
      await setDoc(docRef, { meetingData: data, updatedAt: new Date().toISOString() }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handleReset = () => {
    if (confirm('آیا از بازنشانی صورتجلسه به حالت رسمی با ۴ مورد جدید اطمینان دارید؟')) {
      setData(DEFAULT_MEETING_DATA);
      localStorage.removeItem(`bg_meeting_minutes_v2_${companyId}`);
    }
  };

  const handlePdfExport = async () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }
    setIsExporting(true);
    try {
      await exportElementToPdf({
        elementId: 'meeting-minutes-canvas',
        filename: 'صورتجلسه_مجمع_عمومی_برکت_الله_غفوری.pdf',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWordExport = async () => {
    if (onExportWord) {
      onExportWord();
      return;
    }
    setIsExporting(true);
    try {
      await exportElementToWord({
        elementId: 'meeting-minutes-canvas',
        filename: 'صورتجلسه_مجمع_عمومی_برکت_الله_غفوری',
        title: 'صورتجلسه مجمع عمومی - شرکت صرافی برکت‌الله غفوری'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // List Management
  const addParticipant = () => setData({ ...data, participants: [...data.participants, { id: Date.now(), name: '', position: '', idNo: '' }] });
  const removeParticipant = (id: number) => setData({ ...data, participants: data.participants.filter(p => p.id !== id) });
  
  const addAgenda = () => setData({ ...data, agenda: [...data.agenda, { id: Date.now(), text: '' }] });
  const removeAgenda = (id: number) => setData({ ...data, agenda: data.agenda.filter(a => a.id !== id) });

  const addDecision = () => setData({ ...data, decisions: [...data.decisions, { id: Date.now(), text: '' }] });
  const removeDecision = (id: number) => setData({ ...data, decisions: data.decisions.filter(d => d.id !== id) });

  return (
    <div className="space-y-6 dir-rtl">
      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">مدیریت صورتجلسات رسمی (مجمع عمومی)</h2>
            <p className="text-[11px] text-slate-500">
              شامل ۴ مورد کلیدی: انتقال سهام، تغییر نام شرکت، تغییر نماینده کابل و تغییر رئیس هیئت نظار
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditMode && (
            <button onClick={handleSave} className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition-all cursor-pointer">
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
              <span>{isSaved ? 'ذخیره شد' : 'ذخیره در دیتابیس'}</span>
            </button>
          )}
          {isEditMode && (
            <button onClick={handleReset} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer" title="بازنشانی">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={handlePdfExport} disabled={isExporting} className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <Download className="w-4 h-4" /> 
            <span>{isExporting ? 'صبر کنید...' : 'دانلود PDF'}</span>
          </button>
          <button onClick={handleWordExport} disabled={isExporting} className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <FileCode className="w-4 h-4" /> 
            <span>استخراج Word</span>
          </button>
          <button onClick={() => window.print()} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all cursor-pointer" title="چاپ">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      {isEditMode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm print:hidden animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">شماره صورتجلسه (انگلیسی LTR):</label>
              <input className="w-full p-2 border rounded-xl text-xs font-mono ltr text-left" value={data.meetingNo} onChange={e => setData({...data, meetingNo: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">تاریخ تنظیم (انگلیسی LTR):</label>
              <input className="w-full p-2 border rounded-xl text-xs font-mono ltr text-left" value={data.meetingDate} onChange={e => setData({...data, meetingDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">ساعت برگزاری:</label>
              <input className="w-full p-2 border rounded-xl text-xs" value={data.heldTime} onChange={e => setData({...data, heldTime: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">محل برگزاری:</label>
            <input className="w-full p-2 border rounded-xl text-xs" value={data.location} onChange={e => setData({...data, location: e.target.value})} />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-blue-900 dark:text-blue-300">اشتراک‌کنندگان و اعضای حاضر در جلسه</h3>
              <button onClick={addParticipant} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 text-xs font-bold">
                <Plus className="w-4 h-4" />
                <span>افزودن عضو</span>
              </button>
            </div>
            {data.participants.map((p, i) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-[10px] font-bold block mb-1 text-slate-500">نام و تخلص:</label>
                  <input className="w-full p-2 border rounded-lg text-xs" placeholder="نام" value={p.name} onChange={e => {
                    const updated = [...data.participants];
                    updated[i].name = e.target.value;
                    setData({ ...data, participants: updated });
                  }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold block mb-1 text-slate-500">سمت و مسئولیت:</label>
                  <input className="w-full p-2 border rounded-lg text-xs" placeholder="سمت" value={p.position} onChange={e => {
                    const updated = [...data.participants];
                    updated[i].position = e.target.value;
                    setData({ ...data, participants: updated });
                  }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold block mb-1 text-slate-500">نمبر تذکره / هویت (LTR):</label>
                  <input className="w-full p-2 border rounded-lg text-xs font-mono ltr text-left" placeholder="1399-1104-55522" value={p.idNo} onChange={e => {
                    const updated = [...data.participants];
                    updated[i].idNo = toEnglishDigits(e.target.value);
                    setData({ ...data, participants: updated });
                  }} />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => removeParticipant(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-amber-900 dark:text-amber-300">موضوعات جلسه (Agenda)</h3>
                <button onClick={addAgenda} className="p-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-1 text-xs font-bold">
                  <Plus className="w-4 h-4" />
                  <span>افزودن بند</span>
                </button>
              </div>
              {data.agenda.map((a, i) => (
                <div key={a.id} className="flex gap-2">
                  <textarea rows={2} className="flex-1 p-2 border rounded-lg text-xs" value={a.text} onChange={e => {
                    const updated = [...data.agenda];
                    updated[i].text = e.target.value;
                    setData({ ...data, agenda: updated });
                  }} />
                  <button onClick={() => removeAgenda(a.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg h-fit"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300">تصامیم و فیصله‌ها (Decisions)</h3>
                <button onClick={addDecision} className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold">
                  <Plus className="w-4 h-4" />
                  <span>افزودن مصوبه</span>
                </button>
              </div>
              {data.decisions.map((d, i) => (
                <div key={d.id} className="flex gap-2">
                  <textarea rows={2} className="flex-1 p-2 border rounded-lg text-xs" value={d.text} onChange={e => {
                    const updated = [...data.decisions];
                    updated[i].text = e.target.value;
                    setData({ ...data, decisions: updated });
                  }} />
                  <button onClick={() => removeDecision(d.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg h-fit"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Official Document Canvas */}
      <div 
        id="meeting-minutes-canvas"
        className="bg-white text-slate-950 p-8 sm:p-12 border border-slate-200 rounded-2xl shadow-lg max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0 font-sans leading-relaxed"
      >
        {/* Official Header */}
        <DabOfficialHeader
          storageKey={`meeting_minutes_${companyId}`}
          
          bankName="د افغانستان بانک"
          department="آمریت عمومی نظارت بر مؤسسات مالی غیر بانکی"
          directorate="مدیریت عمومی نظارت و امور حقوقی صرافی‌ها"
          formNumber=""
          formTitle="صورت‌جلسه مجمع عمومی فوق‌العاده و عادی سالانه"
          companyName={data.companyName}
          licenseNo={data.licenseNo}
          serialNo={data.meetingNo}
          letterDate={data.meetingDate}
          logoUrl={customLogo}
          onOpenLogoModal={onOpenLogoModal}
          isEditable={true}
        />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[11px] font-bold border-b border-slate-100 pb-6 px-4">
          <div className="flex justify-between border-b border-slate-50 pb-1 items-center">
            <span className="text-slate-500">شماره صورتجلسه:</span>
            <span className="text-blue-900 font-mono font-bold ltr inline-block">{data.meetingNo}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-1 items-center">
            <span className="text-slate-500">تاریخ تنظیم اسناد:</span>
            <span className="font-mono ltr inline-block">{data.meetingDate}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-1 items-center">
            <span className="text-slate-500">ساعت برگزاری جلسه:</span>
            <span>{data.heldTime}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-1 items-center">
            <span className="text-slate-500">محل دقیق برگزاری:</span>
            <span className="text-[10px]">{data.location}</span>
          </div>
        </div>

        {/* Key Agenda Highlights Box */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="font-black text-blue-950 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-700" />
            <span>خلاصه ۴ مصوبه و تصمیم کلیدی مجمع عمومی:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-800">
            <div className="p-2 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-mono">1</span>
              <span>انتقال 100٪ اسهام حبیب‌الرحمن غفوری به برکت‌الله غفوری</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-mono">2</span>
              <span>تغییر نام شرکت از «ستاره آسیا» به «برکت‌الله غفوری»</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-mono">3</span>
              <span>تغییر نماینده کابل از برکت‌الله غفوری به اجمل احمدی</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-blue-100 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-mono">4</span>
              <span>تغییر رئیس هیئت نظار از بقیت‌الله به بسم‌الله شیرزی</span>
            </div>
          </div>
        </div>

        {/* Participants Table */}
        <div className="space-y-4">
          <h3 className="text-xs font-black flex items-center gap-2 border-r-4 border-blue-900 pr-3 text-blue-950">اشتراک‌کنندگان و حاضرین در جلسه مجمع:</h3>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-[11px] text-right">
              <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-12 text-center font-mono">No.</th>
                  <th className="p-2.5">نام و تخلص</th>
                  <th className="p-2.5">سمت و جایگاه در شرکت</th>
                  <th className="p-2.5 text-center">نمبر تذکره / اسناد هویت (LTR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.participants.map((p, i) => (
                  <tr key={p.id} className="font-semibold text-slate-800 hover:bg-slate-50/50">
                    <td className="p-2.5 text-center text-slate-500 font-mono font-bold">{i + 1}</td>
                    <td className="p-2.5 font-black text-slate-950">{p.name}</td>
                    <td className="p-2.5">{p.position}</td>
                    <td className="p-2.5 text-center font-mono text-[10px] ltr">{p.idNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agenda & Decisions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black flex items-center gap-2 border-r-4 border-amber-600 pr-3 text-amber-950 uppercase tracking-tighter">آجندای کامل جلسه (Agenda):</h3>
            <ul className="space-y-2.5 text-[11px] font-semibold pr-2 leading-relaxed">
              {data.agenda.map((a, i) => (
                <li key={a.id} className="flex gap-2 items-start bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-amber-700 font-black font-mono">{i + 1}.</span>
                  <span className="text-slate-800">{a.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-black flex items-center gap-2 border-r-4 border-emerald-600 pr-3 text-emerald-950 uppercase tracking-tighter">تصامیم و مصوبات رسمی (Decisions):</h3>
            <ul className="space-y-2.5 text-[11px] font-bold pr-2 leading-relaxed">
              {data.decisions.map((d, i) => (
                <li key={d.id} className="flex gap-2 items-start bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-emerald-700 font-black font-mono">{i + 1}.</span>
                  <span className="text-slate-900">{d.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closing */}
        <div className="text-[11px] font-bold leading-loose bg-slate-50/80 p-4 rounded-xl border border-slate-100 text-slate-700 text-justify">
          {data.closingStatement}
        </div>

        {/* Footer */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-black uppercase tracking-tighter">
          <div className="flex items-center gap-4">
            <span>DAB Verified Standard Template</span>
            <span>ID: <span className="font-mono ltr inline-block font-bold">{data.meetingNo}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span>Page 1 of 1</span>
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
            <span className="font-mono ltr">Date: 1405/02/15</span>
          </div>
        </div>
      </div>
    </div>
  );
}

