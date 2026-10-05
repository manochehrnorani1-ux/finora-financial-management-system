'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Check, X, Shield, RefreshCw } from 'lucide-react';

interface CompanyLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl: string | null;
  onSaveLogo: (logoDataUrl: string | null) => void | Promise<void>;
}

export default function CompanyLogoModal({
  isOpen,
  onClose,
  logoUrl,
  onSaveLogo,
}: CompanyLogoModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);
  const [prevLogoUrl, setPrevLogoUrl] = useState<string | null>(logoUrl);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setPreviewUrl(logoUrl);
  }

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('لطفاً یک فایل تصویری معتبر (PNG, JPG, WEBP, SVG) انتخاب کنید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم فایل تصویری نباید بیشتر از 5 مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Compress/resize image using Canvas if it's large to preserve localStorage space
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setPreviewUrl(resizedDataUrl);
        } else {
          setPreviewUrl(result);
        }
      };
      img.onerror = () => {
        setError('خطا در بارگذاری تصویر. لطفاً تصویر دیگری امتحان کنید.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleApply = async () => {
    await onSaveLogo(previewUrl);
    onClose();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all animate-fadeIn dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-800/80 rounded-xl">
              <ImageIcon className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">مدیریت و آپلود لوگوی اختصاصی شرکت</h3>
              <p className="text-xs text-blue-200/80">لوگوی اپلود شده در چارت و تمام فورم‌های رسمی چاپ درج خواهد شد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Logo Preview Area */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
              پیش‌نمایش لوگوی فعال شرکت:
            </p>
            <div className="relative group">
              <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt="Company Custom Logo"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center p-3">
                    <ImageIcon className="w-10 h-10 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs text-slate-400 block font-medium">بدون لوگو</span>
                  </div>
                )}
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-md text-xs font-medium cursor-pointer transition-all scale-90 hover:scale-100"
                  title="حذف این لوگو"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Drag and drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 scale-102'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              جهت انتخاب فایل لوگو اینجا کلیک کنید یا تصویر را بکشید و رها کنید
            </p>
            <p className="text-xs text-slate-500 mt-1">
              فرمت‌های مجاز: PNG, JPG, WEBP, SVG (حداکثر 5 مگابایت)
            </p>
          </div>

          {/* Information Notice */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>نکته مهم:</strong> لوگوی آپلودشده در فضای ذخیره‌سازی Supabase نگهداری می‌شود و در چارت و فورم‌های رسمی چاپ استفاده خواهد شد.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            انصراف
          </button>

          <div className="flex items-center gap-2">
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  onSaveLogo(null);
                  setPreviewUrl(null);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                بازنشانی به لوگوی پیش‌فرض
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              تأیید و ذخیره لوگو
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
