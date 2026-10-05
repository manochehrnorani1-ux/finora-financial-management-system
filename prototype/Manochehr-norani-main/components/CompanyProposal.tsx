'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Printer, RotateCcw, Save, Edit3, Plus, Trash2, 
  Check, Download, Building2, Stamp, Calendar, Hash, ShieldCheck, UserCheck, CheckSquare
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface ProposalMember {
  id: number;
  name: string;
  fatherName?: string;
  tazkiraNo?: string;
  position: string;
}

export interface ProposalShareholder {
  id: number;
  name: string;
}

export interface ProposalData {
  proposalNo: string;
  proposalDate: string;
  approvalStatusText: string;
  subject: string;
  companyName: string;
  licenseNo: string;
  companyAddress: string;
  expiryDate: string;
  recipientTitle: string;
  bodyText: string;
  closingText: string;
  signatoryName: string;
  signatoryTitle: string;
  approvalIntroText: string;
  members: ProposalMember[];
  shareholders: ProposalShareholder[];
}

const DEFAULT_PROPOSAL_DATA: ProposalData = {
  proposalNo: '1404/P-107',
  proposalDate: '1404/11/01',
  approvalStatusText: 'متن پیشنهاد منظور است',
  subject: 'موضوع: معرفی رئیس و اعضای هیئت نظار',
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری',
  licenseNo: 'DAB/7-0965',
  companyAddress: 'ولایت کندز، مومند مارکیت، منزل 2، دکان نمبر 301',
  expiryDate: '1404/11/05',
  recipientTitle: 'به مقام محترم سهمداران شرکت!',
  bodyText: 'محترماً؛ به منظور فعالیت و ادامهٔ کار صرافی و خدمات پولی، رهبری شرکت افراد ذیل را به محضر مقام شما معرفی می‌نماید:',
  closingText: 'غرض اجراآت بعدی به شما معرفی گردید.',
  signatoryName: 'صالح محمد رحیمی',
  signatoryTitle: 'مدیر عملیاتی',
  approvalIntroText: 'سهمداران شرکت پیشنهاد فوق را پس از بررسی و تأیید، افراد ذیل را به عنوان رئیس و اعضای هیئت نظار شرکت احکام می‌نمایند:',
  members: [
    { id: 1, name: 'بسم‌الله شیرزی', position: 'رئیس هیئت نظار', tazkiraNo: '0087654-0201-34210' },
    { id: 2, name: 'برکت‌الله غفوری', position: 'عضو هیئت نظار', tazkiraNo: '1399-1104-55522' },
    { id: 3, name: 'عظیم‌الله رحمانی', position: 'عضو هیئت نظار', tazkiraNo: '0054321-1504-12980' },
  ],
  shareholders: [
    { id: 1, name: 'برکت‌الله غفوری (دارنده 100٪ اسهام)' },
  ]
};

interface CompanyProposalProps {
  companyId?: string;
  customLogo?: string | null;
}

export default function CompanyProposal({ customLogo, companyId = 'default' }: CompanyProposalProps) {
  const [data, setData] = useState<ProposalData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_company_proposal_v3_${companyId}`);
        if (saved) return { ...DEFAULT_PROPOSAL_DATA, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_PROPOSAL_DATA;
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_company_proposal_v3_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_PROPOSAL_DATA, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_PROPOSAL_DATA);
        }
      } catch (e) {
        console.error(e);
      }
    }
    try {
      const docRef = doc(db, 'settings', `company_proposal_v3_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.data();
          if (remote && remote.proposalData) {
            setData((prev) => ({ ...prev, ...remote.proposalData }));
          }
        }
      }, (err) => console.warn(err));
      return () => unsubscribe();
    } catch (e) {
      console.warn(e);
    }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_company_proposal_v3_${companyId}`, JSON.stringify(data));
      try {
        const docRef = doc(db, 'settings', `company_proposal_v3_${companyId}`);
        await setDoc(docRef, {
          proposalData: data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore write fallback', e);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error('Save error', e);
    }
  };

  const handleReset = () => {
    if (window.confirm('آیا از بازنشانی متن پیشنهاد به حالت اولیه اطمینان دارید؟')) {
      setData(DEFAULT_PROPOSAL_DATA);
      localStorage.removeItem(`bg_company_proposal_v2_${companyId}`);
    }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf({
        elementId: 'company-proposal-canvas',
        filename: 'پیشنهاد_تمدید_جواز_برکت_الله_غفوری.pdf',
        orientation: 'portrait'
      });
    } catch (error) {
      console.error(error);
      alert('خطا در دانلود فایل PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateMember = (mIdx: number, field: keyof ProposalMember, value: string) => {
    const updated = [...data.members];
    updated[mIdx] = { ...updated[mIdx], [field]: value };
    setData({ ...data, members: updated });
  };

  const addMember = () => {
    const newId = data.members.length + 1;
    setData({
      ...data,
      members: [...data.members, { id: newId, name: 'نام عضو جدید', position: 'عضو هیئت نظار' }]
    });
  };

  const removeMember = (mIdx: number) => {
    if (data.members.length <= 1) return;
    const updated = [...data.members];
    updated.splice(mIdx, 1);
    setData({ ...data, members: updated });
  };

  const updateShareholder = (sIdx: number, value: string) => {
    const updated = [...data.shareholders];
    updated[sIdx] = { ...updated[sIdx], name: value };
    setData({ ...data, shareholders: updated });
  };

  const addShareholder = () => {
    const newId = data.shareholders.length + 1;
    setData({
      ...data,
      shareholders: [...data.shareholders, { id: newId, name: 'نام سهم‌دار جدید' }]
    });
  };

  const removeShareholder = (sIdx: number) => {
    if (data.shareholders.length <= 1) return;
    const updated = [...data.shareholders];
    updated.splice(sIdx, 1);
    setData({ ...data, shareholders: updated });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 dir-rtl">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">فرم رسمی پیشنهاد / احکام (معرفی هیئت نظار)</h2>
            <p className="text-xs text-slate-500">طراحی شده مطابق فرم مینیمال استاندارد دو ستونه (پیشنهاد و احکام)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isEditMode
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditMode ? 'تکمیل ویرایش' : 'ویرایش متن پیشنهاد'}</span>
          </button>

          {isEditMode && (
            <button
              onClick={handleSave}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'ذخیره شد' : 'ذخیره'}</span>
            </button>
          )}

          <button
            onClick={handlePdfExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'در حال خروجی...' : 'دانلود PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl"
            title="بازنشانی"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editing Form Panel */}
      {isEditMode && (
        <div className="bg-amber-50/80 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 text-xs print:hidden">
          <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 border-b border-amber-200 pb-2">
            <Edit3 className="w-4 h-4" />
            <span>ویرایش متن سند پیشنهاد و احکام</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">نام شرکت:</label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => setData({ ...data, companyName: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">شماره جواز / آدرس:</label>
              <input
                type="text"
                value={data.licenseNo}
                onChange={(e) => setData({ ...data, licenseNo: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">متن اصلی پیشنهاد:</label>
            <textarea
              rows={3}
              value={data.bodyText}
              onChange={(e) => setData({ ...data, bodyText: e.target.value })}
              className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">متن مقدمه احکام سهمداران:</label>
            <textarea
              rows={2}
              value={data.approvalIntroText}
              onChange={(e) => setData({ ...data, approvalIntroText: e.target.value })}
              className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg leading-relaxed"
            />
          </div>

          {/* Members Editor */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b pb-1">
              <label className="font-bold block text-slate-800 dark:text-slate-200">اعضای معرفی‌شده هیئت نظار:</label>
              <button
                onClick={addMember}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold"
              >
                + افزودن عضو
              </button>
            </div>
            <div className="space-y-2">
              {data.members.map((m, mIdx) => (
                <div key={m.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border">
                  <input
                    type="text"
                    value={m.name}
                    placeholder="نام کامل"
                    onChange={(e) => updateMember(mIdx, 'name', e.target.value)}
                    className="p-1.5 border rounded text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={m.position}
                    placeholder="سمت"
                    onChange={(e) => updateMember(mIdx, 'position', e.target.value)}
                    className="p-1.5 border rounded text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={m.fatherName || ''}
                      placeholder="ولد"
                      onChange={(e) => updateMember(mIdx, 'fatherName', e.target.value)}
                      className="flex-1 p-1.5 border rounded text-xs"
                    />
                    <button
                      onClick={() => removeMember(mIdx)}
                      className="p-1.5 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shareholders Editor */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between border-b pb-1">
              <label className="font-bold block text-slate-800 dark:text-slate-200">سهم‌داران (امضاء‌کنندگان احکام):</label>
              <button
                onClick={addShareholder}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold"
              >
                + افزودن سهم‌دار
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {data.shareholders.map((sh, shIdx) => (
                <div key={sh.id} className="flex items-center gap-1 bg-white dark:bg-slate-900 p-2 rounded-lg border">
                  <input
                    type="text"
                    value={sh.name}
                    onChange={(e) => updateShareholder(shIdx, e.target.value)}
                    className="flex-1 p-1 border rounded text-xs font-bold"
                  />
                  <button
                    onClick={() => removeShareholder(shIdx)}
                    className="p-1 text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Minimalist Printable 2-Column Canvas */}
      <div 
        id="company-proposal-canvas"
        className="bg-white text-slate-950 p-6 sm:p-12 border border-slate-300 rounded-[2rem] shadow-xl text-xs sm:text-sm print:shadow-none print:border-none print:p-0 print:m-0 font-sans leading-relaxed dir-rtl space-y-8"
      >
        {/* Company Header with Logo */}
        <div className="text-center space-y-1.5 border-b border-slate-200 pb-6">
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-20 h-20 mx-auto object-contain mb-2" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-[#1e3a8a] text-amber-400 flex flex-col items-center justify-center font-black text-xs shadow-md border-2 border-amber-400/50 mb-2">
              <Building2 className="w-7 h-7 mb-0.5" />
              <span className="text-[9px] text-white">لوگو</span>
            </div>
          )}
          
          <div className="text-xs font-black text-blue-900 tracking-wider">
            د افغانستان بانک
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
            {data.companyName}
          </h1>
          <div className="text-sm font-extrabold text-slate-800">
            پیشنهاد رسمی و احکام مجمع عمومی در خصوص تعیین هیئت نظار
          </div>
          <p className="text-xs font-bold text-slate-600">
            جواز شماره: <span className="font-mono text-blue-900 font-bold">{data.licenseNo}</span> | {data.companyAddress}
          </p>
        </div>

        {/* 2-Column Split: Right = پیشنهاد, Left = احکام */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Right Column: پیشنهاد */}
          <div className="border border-slate-300 rounded-2xl p-6 bg-white flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-4">
              <div className="bg-slate-100 text-slate-950 text-center py-2 px-4 rounded-xl font-black text-base border border-slate-200">
                پیشنهاد
              </div>

              <div className="space-y-1 pt-1">
                <h2 className="font-black text-sm text-slate-950">{data.recipientTitle}</h2>
                <p className="font-extrabold text-xs text-blue-950 bg-blue-50/80 border border-blue-200 p-2 rounded-lg">
                  {data.subject}
                </p>
              </div>

              <p className="text-xs leading-relaxed font-semibold text-slate-900 text-justify">
                {data.bodyText}
              </p>

              <ol className="space-y-2 pr-1 text-xs">
                {data.members.map((m, idx) => (
                  <li key={m.id} className="flex items-start gap-1.5 font-bold text-slate-950">
                    <span className="font-black text-slate-500">{idx + 1}.</span>
                    <div>
                      <span className="font-black text-slate-950">{m.name}</span>
                      {m.fatherName && <span className="text-slate-600 text-[11px] mx-1">ولد {m.fatherName}</span>}
                      {m.tazkiraNo && <span className="text-slate-500 font-mono text-[10px] block sm:inline"> (تذکره: {m.tazkiraNo})</span>}
                      <span className="text-blue-900 font-extrabold mr-1"> بحیث {m.position}.</span>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-xs font-bold text-slate-900 pt-2">
                {data.closingText}
              </p>
            </div>

            {/* Proposal Signatory */}
            <div className="pt-6 border-t border-slate-200 mt-auto space-y-1">
              <p className="text-xs font-bold text-slate-700">با احترام</p>
              <p className="font-black text-sm text-slate-950">{data.signatoryName}</p>
              <p className="text-xs font-bold text-blue-900">{data.signatoryTitle}</p>
              <div className="pt-4 border-t border-dashed border-slate-300 mt-2 text-[11px] text-slate-400 font-bold">
                امضاء
              </div>
            </div>
          </div>

          {/* Left Column: احکام */}
          <div className="border border-slate-300 rounded-2xl p-6 bg-slate-50/50 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-4">
              <div className="bg-slate-200 text-slate-950 text-center py-2 px-4 rounded-xl font-black text-base border border-slate-300">
                احکام
              </div>

              <p className="text-xs leading-relaxed font-bold text-slate-900 text-justify pt-1">
                {data.approvalIntroText}
              </p>

              <ol className="space-y-2.5 pr-1 text-xs">
                {data.members.map((m, idx) => (
                  <li key={m.id} className="font-bold text-slate-950">
                    <span className="font-black text-slate-500 ml-1">{idx + 1}.</span>
                    <span className="font-black text-slate-950">{m.name}</span>
                    <span className="text-blue-900 font-extrabold"> بحیث {m.position}.</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Shareholders Signatures */}
            <div className="pt-6 border-t border-slate-300 mt-auto space-y-3">
              <p className="font-black text-xs text-slate-950">امضاء سهمداران:</p>
              <div className="space-y-3">
                {data.shareholders.map((sh, idx) => (
                  <div key={sh.id} className="flex items-center justify-between text-xs font-bold border-b border-dashed border-slate-300 pb-2">
                    <span className="text-slate-950">{idx + 1}- {sh.name}</span>
                    <span className="text-slate-400 font-normal">امضاء ____________</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 flex justify-between items-center">
          <span>{data.companyName}</span>
          <span>سند رسمی معرفی رئیس و اعضای هیئت نظار (پیشنهاد / احکام)</span>
          <span>جواز {data.licenseNo}</span>
        </div>
      </div>
    </div>
  );
}
