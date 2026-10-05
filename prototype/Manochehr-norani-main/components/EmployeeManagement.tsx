'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Edit, 
  Save, 
  Printer, 
  Download, 
  Search, 
  ChevronRight, 
  Upload, 
  FileText,
  User,
  Phone,
  Mail,
  Briefcase,
  GraduationCap,
  Calendar,
  X,
  CheckCircle2,
  RefreshCcw,
  IdCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  EmployeeRecord, 
  saveEmployee, 
  deleteEmployee, 
  subscribeEmployees,
  DEFAULT_EMPLOYEES,
  seedEmployees 
} from '@/lib/supabaseData';
import { exportElementToPdf } from '@/lib/pdfExport';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EmployeeManagementProps {
  customLogo?: string | null;
  isEditMode?: boolean;
}

const DEFAULT_EMPLOYEE: EmployeeRecord = {
  id: '',
  fullName: '',
  fatherName: '',
  grandfatherName: '',
  position: '',
  tazkiraNo: '',
  education: '',
  experience: '',
  phone: '',
  tin: '',
  email: '',
  photo: null,
  signature: null,
  formDate: new Date().toISOString().split('T')[0],
  updatedAt: new Date().toISOString(),
};

export default function EmployeeManagement({ customLogo, isEditMode = true, companyId = 'default' }: EmployeeManagementProps & { companyId?: string }) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const printableRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedEmployeeId(null);
    setEditingEmployee(null);
    const unsubscribe = subscribeEmployees((data) => {
      setEmployees(data);
      if (data.length > 0) {
        const first = data[0];
        setSelectedEmployeeId((prevId) => {
          if (prevId && data.some(e => e.id === prevId)) {
            const current = data.find(e => e.id === prevId);
            if (current) setEditingEmployee({ ...current });
            return prevId;
          }
          setEditingEmployee({ ...first });
          return first.id;
        });
      } else {
        setSelectedEmployeeId(null);
        setEditingEmployee(null);
      }
    }, companyId);
    return () => unsubscribe();
  }, [companyId]);

  const handleSelectEmployee = (emp: EmployeeRecord) => {
    setSelectedEmployeeId(emp.id);
    setEditingEmployee({ ...emp });
  };

  const handleAddNew = () => {
    const newId = `EMP-${Date.now()}`;
    const newEmp = { ...DEFAULT_EMPLOYEE, id: newId };
    setSelectedEmployeeId(newId);
    setEditingEmployee(newEmp);
  };

  const handleInputChange = (field: keyof EmployeeRecord, value: string) => {
    if (editingEmployee) {
      setEditingEmployee({ ...editingEmployee, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!editingEmployee || !editingEmployee.fullName) {
      alert('لطفاً نام کامل کارمند را وارد کنید');
      return;
    }

    setIsSaving(true);
    try {
      await saveEmployee(editingEmployee, companyId);
      setToastMessage('اطلاعات با موفقیت ذخیره شد');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
      alert('خطا در ذخیره‌سازی اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کارمند اطمینان دارید؟')) return;
    
    try {
      await deleteEmployee(id, companyId);
      if (selectedEmployeeId === id) {
        setSelectedEmployeeId(null);
        setEditingEmployee(null);
      }
    } catch (error) {
      console.error(error);
      alert('خطا در حذف اطلاعات');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از 2 مگابایت باشد');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (editingEmployee) {
        setEditingEmployee({ ...editingEmployee, [field]: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportPdf = async () => {
    if (!editingEmployee) return;
    setIsExporting(true);
    
    try {
      const ok = await exportElementToPdf({
        elementId: 'employee-management-cv-canvas',
        filename: `خلص_سوانح_${editingEmployee.fullName ? editingEmployee.fullName.trim().replace(/\s+/g, '_') : 'پرسونل'}.pdf`,
        paperSize: 'a4',
        orientation: 'portrait',
        marginMm: 6,
        qualityScale: 2.5,
      });

      if (ok) {
        setToastMessage('فایل PDF خلص سوانح با موفقیت تولید و دانلود شد');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        alert('خطا در تولید فایل PDF. لطفاً مجدداً تلاش کنید.');
      }
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('خطا در دانلود فایل PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('آیا می‌خواهید اطلاعات پیش‌فرض تمام کارمندان را بارگذاری کنید؟ (اطلاعات فعلی باقی می‌مانند)')) return;
    
    setIsSaving(true);
    try {
      await seedEmployees(DEFAULT_EMPLOYEES);
      setToastMessage('اطلاعات پیش‌فرض با موفقیت بارگذاری شد');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
      alert('خطا در بارگذاری اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const name = e.fullName || '';
    const pos = e.position || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           pos.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full min-h-[80vh] dir-rtl">
      
      {/* Sidebar - Employee List */}
      <div className="w-full lg:w-80 flex flex-col gap-6 print:hidden">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-full min-h-[600px] transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                کادر پرسنل
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {employees.length} کارمند ثبت شده
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSeedDefaults}
                className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800"
                title="بارگذاری پیش‌فرض"
              >
                <RefreshCcw className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={handleAddNew}
                className="p-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                title="افزودن"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="جستجو نام یا سمت..."
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 -mr-1">
            {filteredEmployees.map((emp) => (
              <motion.div
                key={emp.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleSelectEmployee(emp)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 group ${
                  selectedEmployeeId === emp.id 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border transition-colors ${
                  selectedEmployeeId === emp.id ? 'border-white/20' : 'border-slate-100 dark:border-slate-800'
                }`}>
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-6 h-6 ${selectedEmployeeId === emp.id ? 'text-white' : 'text-slate-300'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-black truncate ${selectedEmployeeId === emp.id ? 'text-white' : ''}`}>{emp.fullName || 'نامشخص'}</p>
                  <p className={`text-[10px] font-bold mt-0.5 truncate ${selectedEmployeeId === emp.id ? 'text-blue-100' : 'text-slate-400'}`}>{emp.position || '---'}</p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all ${selectedEmployeeId === emp.id ? 'text-white translate-x-1' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
              </motion.div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[13px] font-bold text-slate-400">کارمندی یافت نشد</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Employee Form */}
      <div className="flex-1 space-y-8">
        {editingEmployee ? (
          <>
            {/* Header / Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-6 print:hidden transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <IdCard className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">پرونده پرسنلی</h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">مدیریت اسناد و اطلاعات هویتی کارمند</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[13px] font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ذخیره اطلاعات
                </button>
                <button 
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-950 text-white rounded-2xl text-[13px] font-black flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20"
                >
                  {isExporting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  خروجی PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 dark:border-slate-700"
                >
                  <Printer className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button 
                  onClick={() => handleDelete(editingEmployee.id)}
                  className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30"
                >
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>

            {/* Form & Print Preview Container */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Edit Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm print:hidden">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <Edit className="w-4 h-4 text-blue-500" />
                  اطلاعات هویتی و تخصصی
                </h3>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="نام مکمل" value={editingEmployee.fullName} onChange={(v) => handleInputChange('fullName', v)} icon={<User className="w-4 h-4" />} />
                    <FormField label="نام پدر" value={editingEmployee.fatherName} onChange={(v) => handleInputChange('fatherName', v)} />
                    <FormField label="نام پدر کلان" value={editingEmployee.grandfatherName} onChange={(v) => handleInputChange('grandfatherName', v)} />
                    <FormField label="موقف در شرکت" value={editingEmployee.position} onChange={(v) => handleInputChange('position', v)} icon={<Briefcase className="w-4 h-4" />} />
                    <FormField label="شماره تذکره" value={editingEmployee.tazkiraNo} onChange={(v) => handleInputChange('tazkiraNo', v)} icon={<IdCard className="w-4 h-4" />} />
                    <FormField label="تحصیلات / رشته" value={editingEmployee.education} onChange={(v) => handleInputChange('education', v)} icon={<GraduationCap className="w-4 h-4" />} />
                    <FormField label="شماره تماس" value={editingEmployee.phone} onChange={(v) => handleInputChange('phone', v)} icon={<Phone className="w-4 h-4" />} />
                    <FormField label="نمبر تشخیصیه (TIN)" value={editingEmployee.tin} onChange={(v) => handleInputChange('tin', v)} />
                    <FormField label="ایمیل" value={editingEmployee.email} onChange={(v) => handleInputChange('email', v)} icon={<Mail className="w-4 h-4" />} />
                    <FormField label="تاریخ ثبت" type="date" value={editingEmployee.formDate} onChange={(v) => handleInputChange('formDate', v)} icon={<Calendar className="w-4 h-4" />} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 px-1">تجربه کاری و مهارت‌ها</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[120px] transition-all"
                      value={editingEmployee.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="سوابق کاری، تخصص‌ها و مهارت‌های فنی..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-4 text-center">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        آپلود عکس پرسنلی
                      </label>
                      <div 
                        onClick={() => photoInputRef.current?.click()}
                        className="aspect-[3/4] max-w-[140px] mx-auto bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all relative overflow-hidden group shadow-inner"
                      >
                        {editingEmployee.photo ? (
                          <img src={editingEmployee.photo} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <>
                            <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm mb-2 text-slate-300">
                              <User className="w-8 h-8" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">انتخاب فایل</span>
                          </>
                        )}
                        <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
                      </div>
                    </div>

                    <div className="space-y-4 text-center">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" />
                        آپلود امضاء الکترونیک
                      </label>
                      <div 
                        onClick={() => signatureInputRef.current?.click()}
                        className="aspect-[16/9] bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all relative overflow-hidden group shadow-inner"
                      >
                        {editingEmployee.signature ? (
                          <img src={editingEmployee.signature} alt="Signature" className="max-h-full p-4 transition-transform group-hover:scale-105" />
                        ) : (
                          <>
                            <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm mb-2 text-slate-300">
                              <Edit className="w-8 h-8" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">انتخاب امضاء</span>
                          </>
                        )}
                        <input type="file" ref={signatureInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'signature')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Preview */}
              <div className="bg-slate-100 dark:bg-slate-950/50 p-4 sm:p-6 rounded-3xl overflow-y-auto max-h-[85vh] custom-scrollbar shadow-inner border border-slate-200/50 dark:border-slate-800 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4 px-2 print:hidden max-w-[210mm]">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    پیش‌نمایش فرم خلص سوانح (A4 رسمی)
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-mono font-black">
                    STANDARD DAB FORM
                  </span>
                </div>

                <div 
                  id="employee-management-cv-canvas"
                  ref={printableRef}
                  className="bg-white text-slate-900 font-serif relative shadow-2xl p-6 sm:p-10 w-full max-w-[210mm] min-h-[297mm] mx-auto border-2 border-slate-800 print:border-none print:shadow-none print:p-0 print:w-full"
                  style={{ direction: 'rtl' }}
                >
                  {/* Outer Frame */}
                  <div className="border-4 border-double border-slate-900 p-6 sm:p-8 bg-white relative min-h-[275mm] flex flex-col justify-between">
                    
                    {/* Background Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none w-2/3">
                      <img src={customLogo || "/assets/dab_logo.png"} alt="Watermark" className="w-full object-contain" />
                    </div>

                    <div>
                      {/* Document Header */}
                      <div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-6 relative z-10">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white flex items-center justify-center p-1.5 border border-slate-200 rounded-xl shadow-xs shrink-0">
                          <img src={customLogo || "/assets/dab_logo.png"} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>

                        <div className="text-center flex-1 px-4">
                          <div className="text-xs font-black text-blue-900 tracking-wider mb-1">
                            د افغانستان بانک
                          </div>
                          <h1 className="text-base sm:text-xl font-black mb-1 tracking-tight text-slate-950">
                            شرکت صرافی و خدمات پولی برکت‌الله غفوری (سهامی خاص)
                          </h1>
                          <p className="text-xs font-bold text-slate-700 mb-3">
                            شماره جواز فعالیت: <span className="font-mono font-black text-slate-900">DAB/7-0965</span>
                          </p>
                          <div className="inline-block bg-slate-900 text-white px-6 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-xs tracking-wide">
                            فورم استاندارد خلص سوانح و مشخصات پرسونل
                          </div>
                        </div>

                        <div className="w-24 sm:w-28 shrink-0"></div>
                      </div>

                      {/* Personal & Employment Details Grid */}
                      <div className="grid grid-cols-12 gap-6 relative z-10 text-[13px] sm:text-[14px] mt-4">
                        
                        {/* Employee Photo Frame */}
                        <div className="col-span-12 sm:col-span-3 flex flex-col items-center justify-start">
                          <div className="w-32 h-40 border-2 border-slate-900 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-sm relative">
                            {editingEmployee.photo ? (
                              <img src={editingEmployee.photo} alt="Employee" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-2">
                                <User className="w-10 h-10 mx-auto mb-1 text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400">عکس ۳×۴ پرسنلی</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-center text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 w-full">
                            مشخصات هویت فردی
                          </div>
                        </div>

                        {/* Details Table */}
                        <div className="col-span-12 sm:col-span-9">
                          <table className="w-full border-collapse border-2 border-slate-900 text-right">
                            <tbody>
                              <tr>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black w-32 text-slate-800">اسم مکمل:</td>
                                <td className="border border-slate-900 p-2.5 font-bold text-base text-slate-950">{editingEmployee.fullName || '---'}</td>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black w-24 text-slate-800">نام پدر:</td>
                                <td className="border border-slate-900 p-2.5 font-bold text-slate-950">{editingEmployee.fatherName || '---'}</td>
                              </tr>
                              <tr>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">نام پدرکلان:</td>
                                <td className="border border-slate-900 p-2.5 font-bold text-slate-950">{editingEmployee.grandfatherName || '---'}</td>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">موقف وظیفوی:</td>
                                <td className="border border-slate-900 p-2.5 font-black text-blue-900 text-sm">{editingEmployee.position || '---'}</td>
                              </tr>
                              <tr>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">شماره تذکره:</td>
                                <td className="border border-slate-900 p-2.5 font-mono font-bold text-slate-950">{editingEmployee.tazkiraNo || '---'}</td>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">تحصیلات:</td>
                                <td className="border border-slate-900 p-2.5 font-bold text-slate-950">{editingEmployee.education || '---'}</td>
                              </tr>
                              <tr>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">شماره تماس:</td>
                                <td className="border border-slate-900 p-2.5 font-mono font-bold text-slate-950">{editingEmployee.phone || '---'}</td>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">نمبر TIN:</td>
                                <td className="border border-slate-900 p-2.5 font-mono font-bold text-slate-950">{editingEmployee.tin || '---'}</td>
                              </tr>
                              <tr>
                                <td className="border border-slate-900 p-2.5 bg-slate-100 font-black text-slate-800">ایمیل آدرس:</td>
                                <td className="border border-slate-900 p-2.5 font-mono font-bold text-slate-950" colSpan={3}>{editingEmployee.email || '---'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Experience and Skills Box */}
                      <div className="mt-6 relative z-10">
                        <div className="bg-slate-900 text-white px-4 py-2 font-black text-xs sm:text-sm rounded-t-lg border-2 border-b-0 border-slate-900 flex items-center justify-between">
                          <span>سوابق کاری، تجارب و مهارت‌های تخصصی</span>
                          <span className="text-[11px] font-normal opacity-80">ثبت رسمی در پرونده پرسنلی</span>
                        </div>
                        <div className="border-2 border-slate-900 p-4 bg-slate-50/60 rounded-b-lg min-h-[140px] text-xs sm:text-sm font-medium leading-relaxed text-justify whitespace-pre-wrap break-words text-slate-900">
                          {editingEmployee.experience || 'اطلاعات سوابق کاری و تجارب کاری در سیستم ثبت نشده است.'}
                        </div>
                      </div>
                    </div>

                    {/* Footer Declaration & Signatures */}
                    <div>
                      <div className="mt-6 pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-2">
                          <p className="font-black text-slate-900 text-xs sm:text-sm">تأییدیه و امضاء کارمند:</p>
                          <p className="text-[10px] text-slate-600 font-medium leading-normal">
                            صحت تمام معلومات فوق مورد تأیید اینجانب می‌باشد.
                          </p>
                          <div className="h-24 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                            {editingEmployee.signature ? (
                              <img src={editingEmployee.signature} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">محل امضاء و اثر شصت کارمند</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-right">
                          <p className="font-black text-slate-900 text-xs sm:text-sm">تأییدیه مدیریت منابع انسانی و اداره:</p>
                          <div className="text-right space-y-1 text-xs">
                            <p className="font-bold text-slate-800">تاریخ منظوری: <span className="font-mono text-blue-900 font-black">{editingEmployee.formDate || '۱۴۰۳'}</span></p>
                            <p className="text-[10px] text-slate-600 font-medium">کد بایگانی رسمی: <span className="font-mono font-bold text-slate-950">DAB-EMP-{editingEmployee.id.substring(0,8).toUpperCase()}</span></p>
                          </div>
                          <div className="h-24 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center p-2 text-xs font-bold text-slate-700">
                            <span>آمریت منابع انسانی و اجراآت</span>
                            <span className="text-[10px] text-slate-500 font-normal mt-0.5">شرکت صرافی و خدمات پولی برکت‌الله غفوری</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-center border-t border-slate-300 pt-3 text-[10px] text-slate-500 font-medium">
                        این سند بر اساس مقررات د افغانستان بانک تنظیم گردیده و به عنوان خلص سوانح رسمی در بایگانی شرکت محفوظ است.
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center transition-all">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-slate-100 dark:border-slate-700">
              <User className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">پرونده‌ای انتخاب نشده است</h2>
            <p className="text-[13px] text-slate-500 max-w-xs mb-10 font-medium leading-relaxed">برای مشاهده جزئیات و یا ویرایش اسناد، یکی از پرسنل را از لیست سمت راست انتخاب نمایید.</p>
            <button 
              onClick={handleAddNew}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl shadow-blue-600/20"
            >
              <UserPlus className="w-6 h-6" />
              افزودن کارمند جدید
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold">{toastMessage}</span>
            <button onClick={() => setShowToast(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", icon }: { label: string, value: string, onChange: (v: string) => void, type?: string, icon?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        placeholder={`${label}...`}
      />
    </div>
  );
}
