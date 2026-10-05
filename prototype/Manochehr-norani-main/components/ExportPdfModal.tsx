'use client';

import React, { useState } from 'react';
import { Download, FileText, Check, X, ShieldCheck, Printer, Settings, Loader2, FileCode, Sparkles, Image as ImageIcon } from 'lucide-react';
import { exportElementToPdf, exportElementToPng } from '@/lib/pdfExport';
import { exportElementToWord } from '@/lib/wordExport';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetElementId: string;
  defaultTitle?: string;
  defaultFilename?: string;
  initialFormat?: 'pdf' | 'word' | 'image';
}

export default function ExportPdfModal({
  isOpen,
  onClose,
  targetElementId,
  defaultTitle = 'چارت تشکیلاتی و ساختار سازمانی شرکت',
  defaultFilename = 'سند_رسمی_صرافی.pdf',
  initialFormat = 'pdf',
}: ExportPdfModalProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'image'>(initialFormat);
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [qualityScale, setQualityScale] = useState<number>(2.5);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    // Give browser a frame to show loading UI
    await new Promise((resolve) => setTimeout(resolve, 150));

    let success = false;

    if (exportFormat === 'pdf') {
      success = await exportElementToPdf({
        elementId: targetElementId,
        filename: defaultFilename.replace(/\.(doc|docx|png)$/i, '.pdf'),
        paperSize,
        orientation,
        marginMm,
        qualityScale,
      });
    } else if (exportFormat === 'image') {
      const pngFilename = defaultFilename.replace(/\.(pdf|doc|docx)$/i, '.png');
      success = await exportElementToPng({
        elementId: targetElementId,
        filename: pngFilename,
        qualityScale,
      });
    } else {
      const wordFilename = defaultFilename.replace(/\.(pdf|png)$/i, '.doc');
      success = await exportElementToWord({
        elementId: targetElementId,
        filename: wordFilename,
        title: defaultTitle,
        orientation,
        paperSize,
      });
    }

    setIsExporting(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fadeIn dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-800/80 rounded-xl">
              {exportFormat === 'word' ? (
                <FileCode className="w-6 h-6 text-blue-200" />
              ) : (
                <Download className="w-6 h-6 text-blue-200" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {exportFormat === 'word' ? 'استخراج به مایکروسافت ورد (Word)' : 'دانلود فایل PDF با کیفیت بالا'}
              </h3>
              <p className="text-xs text-blue-200/80">استاندارد رسمی و سازگار با سیستم‌های اداری د افغانستان بانک</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExportFormat('image')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              exportFormat === 'image'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-purple-200" />
            <span>تصویر (PNG)</span>
          </button>

          <button
            type="button"
            onClick={() => setExportFormat('word')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              exportFormat === 'word'
                ? 'bg-blue-800 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-300" />
            <span>ورد (Word)</span>
          </button>

          <button
            type="button"
            onClick={() => setExportFormat('pdf')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              exportFormat === 'pdf'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>فایل PDF</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {exportFormat === 'word' ? (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                <strong>مشخصات فایل Word:</strong> سند خروجی با فرمت استاندارد مایکروسافت ورد (.doc) تولید شده و شامل تمامی جداول، راست‌به‌چپ (RTL)، اطلاعات ویرایش‌شده، آرم و ساختار استاندارد قابل ویرایش است.
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                <strong>مشخصات فایل PDF:</strong> سند در قالب فایل تصویری برداری با رزولوشن بالا همراه با سربرگ رسمی، حاشیه‌بندی دقیق و کادر مهر شرکت ذخیره می‌گردد.
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Title / Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان سند انتخابی:
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{defaultTitle}</span>
              </div>
            </div>

            {/* Paper Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  جهت صفحه:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      orientation === 'portrait'
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    عمودی (استاندارد)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      orientation === 'landscape'
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    افقی (چارت)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  قطع کاغذ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperSize('a4')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      paperSize === 'a4'
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('a3')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      paperSize === 'a3'
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    A3 (بزرگ)
                  </button>
                </div>
              </div>
            </div>

            {exportFormat === 'pdf' && (
              <>
                {/* Standard Margins selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    حاشیه‌های استاندارد صفحه (میلی‌متر):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 5, label: 'کم (5mm)' },
                      { value: 10, label: 'استاندارد (10mm)' },
                      { value: 15, label: 'پهن (15mm)' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setMarginMm(item.value)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                          marginMm === item.value
                            ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality & Resolution settings */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-600" />
                    کیفیت و رزولوشن خروجی (DPI):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQualityScale(2.5)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                        qualityScale === 2.5
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      عالی (300 DPI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQualityScale(3.5)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                        qualityScale === 3.5
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      حداکثر فوق‌العاده (400 DPI)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
          >
            انصراف
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              پیش‌نمایش چاپ مرورگر
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 ${
                exportFormat === 'word'
                  ? 'bg-blue-800 hover:bg-blue-700'
                  : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {exportFormat === 'word' ? 'در حال ساخت فایل Word...' : 'در حال ساخت PDF...'}
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  ذخیره شد!
                </>
              ) : exportFormat === 'word' ? (
                <>
                  <FileCode className="w-4 h-4" />
                  دانلود فایل Word (.doc)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  ذخیره فایل PDF
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
