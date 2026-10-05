'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, Download, Eye, X, ZoomIn, ZoomOut, Maximize2, 
  ShieldCheck, FileText, CheckCircle2, Sliders, Layers 
} from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetElementId: string;
  documentTitle?: string;
  onOpenPdfExport?: () => void;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  targetElementId,
  documentTitle = 'چارت تشکیلاتی و ساختار سازمانی رسمی شرکت برکت‌الله غفوری',
  onOpenPdfExport,
}: PrintPreviewModalProps) {
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [zoomLevel, setZoomLevel] = useState<number>(90);
  const [showMarginGuide, setShowMarginGuide] = useState<boolean>(true);
  const [clonedHtml, setClonedHtml] = useState<string>('');

  // Clone target element HTML when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const el = document.getElementById(targetElementId);
        if (el) {
          setClonedHtml(el.innerHTML);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetElementId]);

  if (!isOpen) return null;

  // Paper dimensions in mm
  const paperDimensions = {
    a4: { landscape: { w: 297, h: 210 }, portrait: { w: 210, h: 297 } },
    a3: { landscape: { w: 420, h: 297 }, portrait: { w: 297, h: 420 } },
  }[paperSize][orientation];

  // DPI conversion: 1mm ≈ 3.78px
  const mmToPx = 3.78;
  const paperW = paperDimensions.w * mmToPx;
  const paperH = paperDimensions.h * mmToPx;
  const printableW = paperDimensions.w - marginMm * 2;
  const printableH = paperDimensions.h - marginMm * 2;

  const handleTriggerPrint = () => {
    // Inject print styles for specific orientation
    const style = document.createElement('style');
    style.innerHTML = `
      @page { 
        size: ${paperSize} ${orientation}; 
        margin: ${marginMm}mm; 
      }
      @media print {
        body * { visibility: hidden; }
        #print-content-area, #print-content-area * { visibility: visible; }
        #print-content-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          direction: rtl;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-slate-100 backdrop-blur-md animate-fadeIn dir-rtl overflow-hidden">
      
      {/* Top Floating Control Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900/80 rounded-2xl text-blue-300 border border-blue-800/50">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">پیش‌نمایش نسخه چاپ و بررسی حاشیه‌ها</h2>
              <span className="bg-emerald-950 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                استاندارد DAB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{documentTitle}</p>
          </div>
        </div>

        {/* Toolbar Settings Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 border border-slate-700/60 p-1.5 rounded-2xl">
          
          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                orientation === 'landscape' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 rotate-90" />
              افقی
            </button>
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                orientation === 'portrait' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              عمودی
            </button>
          </div>

          {/* Paper Size Toggle */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setPaperSize('a4')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                paperSize === 'a4' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              A4
            </button>
            <button
              onClick={() => setPaperSize('a3')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                paperSize === 'a3' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              A3
            </button>
          </div>

          {/* Margin Settings */}
          <div className="flex items-center gap-1 text-xs text-slate-300 px-2 border-r border-slate-700">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-400">حاشیه:</span>
            {[
              { val: 5, label: '5mm' },
              { val: 10, label: '10mm (DAB)' },
              { val: 15, label: '15mm' },
            ].map((m) => (
              <button
                key={m.val}
                onClick={() => setMarginMm(m.val)}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  marginMm === m.val ? 'bg-blue-900 text-white' : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Margin Visual Guide Toggle */}
          <button
            onClick={() => setShowMarginGuide(!showMarginGuide)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showMarginGuide 
                ? 'bg-amber-950/60 border-amber-800/80 text-amber-300' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="نمایش/مخفی‌سازی کادر راهنمای حاشیه استاندارد"
          >
            <Layers className="w-3.5 h-3.5" />
            خطوط راهنما
          </button>

          {/* Zoom Controller */}
          <div className="flex items-center gap-1 text-xs bg-slate-900 rounded-xl p-1 border-r border-slate-700 pr-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 50))}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="کاهش بزرگنمایی"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] font-bold w-10 text-center text-blue-300">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 150))}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="افزایش بزرگنمایی"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(90)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="بازنشانی رزولوشن"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenPdfExport && (
            <button
              onClick={onOpenPdfExport}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              دانلود PDF با کیفیت
            </button>
          )}

          <button
            onClick={handleTriggerPrint}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            چاپ مستقیم (مرورگر)
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="بستن پیش‌نمایش"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-950/80">
        
        {/* Virtual Paper Container */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            width: `${paperW}px`,
            height: `${paperH}px`,
          }}
          className="relative bg-white text-slate-900 rounded-sm shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-300 transition-all flex flex-col items-center justify-start overflow-hidden"
        >
          {/* Printable Sheet Outer Representation */}
          <div
            id="print-content-area"
            style={{
              padding: `${marginMm * mmToPx}px`,
              width: '100%',
              height: '100%',
            }}
            className="relative flex flex-col"
          >
            {/* Dashed Margin Guide Box */}
            {showMarginGuide && (
              <div 
                style={{
                  top: `${marginMm * mmToPx}px`,
                  bottom: `${marginMm * mmToPx}px`,
                  left: `${marginMm * mmToPx}px`,
                  right: `${marginMm * mmToPx}px`,
                }}
                className="absolute border-2 border-dashed border-amber-500/50 pointer-events-none rounded-xs z-20 flex flex-col justify-between p-2"
              >
                <div className="flex justify-between text-[10px] font-mono text-amber-600 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200 self-start">
                  محدوده مجاز چاپ - حاشیه {marginMm}mm
                </div>
                <div className="self-end text-[10px] font-mono text-amber-600 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200">
                  {printableW}mm × {printableH}mm
                </div>
              </div>
            )}

            {/* Cloned Element Content Container */}
            <div 
              className="bg-white p-2 rounded-xl text-slate-900 flex-1 overflow-hidden"
              dangerouslySetInnerHTML={{ __html: clonedHtml }}
            />
          </div>
        </div>

      </div>

      {/* Bottom Status Information Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            ابعاد کاغذ: <strong className="text-slate-200">{paperSize.toUpperCase()} ({paperDimensions.w} × {paperDimensions.h} mm)</strong>
          </span>
          <span className="border-r border-slate-800 pr-4">
            سطح مفید چاپ: <strong className="text-slate-200">{printableW} × {printableH} mm</strong>
          </span>
          <span className="border-r border-slate-800 pr-4 hidden sm:inline-block">
            حاشیه استاندارد د افغانستان بانک: <strong className="text-emerald-400">10 میلی‌متر (رعایت‌شده)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>آماده ارسال به پرینتر یا خروجی فایل رسمی DAB</span>
        </div>
      </div>

    </div>
  );
}
