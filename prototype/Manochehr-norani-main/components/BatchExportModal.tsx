'use client';

import React, { useState } from 'react';
import { Download, FileText, Check, X, ShieldCheck, Printer, Settings, Loader2, FileStack, CheckSquare, Square } from 'lucide-react';
import { exportElementToPdf } from '@/lib/pdfExport';
import { exportElementToWord } from '@/lib/wordExport';

export interface BatchDocumentItem {
  id: string;
  title: string;
  category: string;
  description: string;
  targetId: string;
  defaultOrientation?: 'portrait' | 'landscape';
}

export const ALL_BATCH_DOCUMENTS: BatchDocumentItem[] = [
  {
    id: 'license-renewal-letter',
    title: 'مکتوب رسمی درخواست تمدید جواز',
    category: 'مکاتیب رسمی',
    description: 'مکتوب عنوانی آمریت عمومی نظارت از مؤسسات مالی غیر بانکی',
    targetId: 'dab-license-renewal-letter-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'meeting-minutes',
    title: 'صورت‌جلسه مجمع عمومی',
    category: 'اسناد شرکتی',
    description: 'صورت‌جلسه مجمع عمومی فوق‌العاده و عادی سالانه',
    targetId: 'meeting-minutes-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'org-chart',
    title: 'چارت تشکیلاتی و ساختار سازمانی',
    category: 'تشکیلات',
    description: 'ساختار تشکیلاتی مصوب د افغانستان بانک به همراه سوانح',
    targetId: 'org-chart-exact-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'license-renewal',
    title: 'فورم شماره (۱) — تمدید جواز دفتر مرکزی',
    category: 'فورم‌های DAB',
    description: 'فورم درخواستی تمدید جواز شرکت صرافی و خدمات پولی',
    targetId: 'dab-license-renewal-form-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'branch-renewal',
    title: 'فورم شماره (۲) — تمدید جواز نمایندگی‌ها',
    category: 'فورم‌های DAB',
    description: 'فورم درخواستی تمدید جواز نمایندگی‌های شرکت صرافی',
    targetId: 'dab-branch-renewal-form-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'guarantee-form',
    title: 'تعهدنامه و تضمین‌خط بانکی و سهمداران',
    category: 'فورم‌های DAB',
    description: 'فورم تعهدنامه و تضمین‌خط بانکی و شرکتی',
    targetId: 'dab-guarantee-form-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'license-renewal-checklist',
    title: 'چک‌لیست معیاری تمدید جواز صرافی',
    category: 'چک‌لیست‌ها',
    description: 'چک‌لیست ۲۳ ماده‌ای بررسی اسناد تمدید جواز د افغانستان بانک',
    targetId: 'dab-license-renewal-checklist-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'branch-renewal-checklist',
    title: 'چک‌لیست تمدید نمایندگی‌ها',
    category: 'چک‌لیست‌ها',
    description: 'چک‌لیست اسناد و مدارک تمدید فعالیت نمایندگی‌های ولایتی',
    targetId: 'dab-branch-renewal-checklist-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'company-articles',
    title: 'اساسنامه معیاری شرکت صرافی',
    category: 'اسناد شرکتی',
    description: 'اساسنامه رسمی طبق اصولنامه تجارت و مقررات DAB',
    targetId: 'company-articles-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'company-proposal',
    title: 'پیشنهاد و احکام تعیین هیئت نظار',
    category: 'اسناد شرکتی',
    description: 'پیشنهاد رسمی و احکام مجمع عمومی در خصوص هیئت نظار',
    targetId: 'company-proposal-canvas',
    defaultOrientation: 'portrait',
  },
  {
    id: 'compliance-reporting',
    title: 'گزارش‌های مبارزه با پولشویی (FinTRACA / AML)',
    category: 'راپوردهی مالی',
    description: 'راپور معاملات مشکوک و بزرگ نقدی به د افغانستان بانک',
    targetId: 'compliance-report-canvas',
    defaultOrientation: 'portrait',
  },
];

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  licenseNumber: string;
  issueDate: string;
  onSelectedDocsChange?: (selectedIds: string[], meta: { id: string; title: string; category: string }[]) => void;
}

export default function BatchExportModal({
  isOpen,
  onClose,
  companyName,
  licenseNumber,
  issueDate,
  onSelectedDocsChange,
}: BatchExportModalProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([
    'license-renewal-letter',
    'meeting-minutes',
    'org-chart',
    'license-renewal',
    'branch-renewal',
    'guarantee-form',
    'license-renewal-checklist',
  ]);

  const [exportFormat, setExportFormat] = useState<'pdf' | 'word'>('pdf');
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedDocIds.length === ALL_BATCH_DOCUMENTS.length) {
      setSelectedDocIds([]);
      if (onSelectedDocsChange) onSelectedDocsChange([], []);
    } else {
      const allIds = ALL_BATCH_DOCUMENTS.map((d) => d.id);
      setSelectedDocIds(allIds);
      if (onSelectedDocsChange) {
        onSelectedDocsChange(
          allIds,
          ALL_BATCH_DOCUMENTS.map((d) => ({ id: d.id, title: d.title, category: d.category }))
        );
      }
    }
  };

  const toggleDoc = (id: string) => {
    const updated = selectedDocIds.includes(id)
      ? selectedDocIds.filter((d) => d !== id)
      : [...selectedDocIds, id];
    setSelectedDocIds(updated);
    if (onSelectedDocsChange) {
      onSelectedDocsChange(
        updated,
        ALL_BATCH_DOCUMENTS.filter((d) => updated.includes(d.id)).map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
        }))
      );
    }
  };

  const handleBatchExport = async () => {
    if (selectedDocIds.length === 0) return;

    setIsExporting(true);
    setExportSuccess(false);

    await new Promise((resolve) => setTimeout(resolve, 200));

    let success = false;
    const targetElementId = 'batch-export-staging-container';

    if (exportFormat === 'pdf') {
      success = await exportElementToPdf({
        elementId: targetElementId,
        filename: `بسته_کامل_تمدید_جواز_${companyName.replace(/\s+/g, '_')}.pdf`,
        paperSize,
        orientation: 'portrait',
        marginMm: 8,
        qualityScale: 2.2,
      });
    } else {
      success = await exportElementToWord({
        elementId: targetElementId,
        filename: `بسته_کامل_تمدید_جواز_${companyName.replace(/\s+/g, '_')}.doc`,
        title: `بسته جامع اسناد و فورم‌های تمدید جواز ${companyName}`,
        orientation: 'portrait',
        paperSize,
      });
    }

    setIsExporting(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <FileStack className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">خروجی یکجای بسته اسناد تمدید جواز</h2>
              <p className="text-xs text-slate-500 font-semibold">تولید خودکار دفترچه کامل چاپی در یک فایل PDF یا Word</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Select all bar */}
          <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="text-xs font-bold text-blue-950">
              {selectedDocIds.length} از {ALL_BATCH_DOCUMENTS.length} سند انتخاب شده است
            </span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-black text-blue-900 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedDocIds.length === ALL_BATCH_DOCUMENTS.length ? (
                <>
                  <CheckSquare className="w-4 h-4" /> لغو انتخاب همه
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" /> انتخاب همه اسناد
                </>
              )}
            </button>
          </div>

          {/* List of documents */}
          <div className="grid grid-cols-1 gap-2">
            {ALL_BATCH_DOCUMENTS.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/40 text-blue-950'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-blue-900 text-white' : 'border border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{doc.title}</h4>
                      <p className="text-[11px] text-slate-500">{doc.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {doc.category}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Export Settings */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">فرمت خروجی:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    exportFormat === 'pdf'
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  PDF (چاپی)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('word')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    exportFormat === 'word'
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Word (DOC)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اندازه صفحه:</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
                className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="a4">صفحه A4 استاندارد</option>
                <option value="a3">صفحه A3 عریض</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={isExporting || selectedDocIds.length === 0}
            onClick={handleBatchExport}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال گردآوری و تولید فایل...
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                دانلود با موفقیت انجام شد!
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                دانلود بسته کامل ({selectedDocIds.length} سند)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
