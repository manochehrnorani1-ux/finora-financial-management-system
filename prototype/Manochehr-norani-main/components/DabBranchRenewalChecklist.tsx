"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Printer,
  RotateCcw,
  Save,
  Download,
  Building2,
  UserCheck,
  FileCheck,
  Info,
  Users,
  ShieldCheck,
  Activity,
  Image as ImageIcon,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { exportElementToPdf } from "@/lib/pdfExport";
import DabOfficialHeader from "./DabOfficialHeader";
import { db } from '@/lib/firebaseCompat';
import { doc, setDoc, onSnapshot } from '@/lib/firestoreCompat';

export interface BranchStaffMember {
  id: number;
  position: string; // 'نماینده' | 'کارمند نمایندگی'
  name: string;
  fatherName: string;
  idNo: string;
  education: string;
  infoForm?: string;
  statusType: "سابقه" | "جدید";
  tin?: string;
  criminalInquiry?: string;
  sanctions?: string;
}

export interface BranchChecklistItem {
  id: number;
  text: string;
  status: "ارائه شده" | "تایید شده" | "عدم ارائه";
  note?: string;
}

export interface BranchRenewalChecklistData {
  companyName: string;
  licenseNo: string;
  branchNo: string;
  marketName: string;
  shopNo: string;
  districtProvince: string;
  dateStr: string;
  staff: BranchStaffMember[];
  checklistItems: BranchChecklistItem[];
}

const DEFAULT_BRANCH_RENEWAL_CHECKLIST: BranchRenewalChecklistData = {
  companyName: "برکت الله غفوری",
  licenseNo: "DAB/7-0965",
  branchNo: "1 (کابل)",
  marketName: "مارکیت سرای شهزاده",
  shopNo: "188",
  districtProvince: "ناحیه اول / کابل",
  dateStr: "1404/01/01",
  staff: [
    {
      id: 1,
      position: "نماینده",
      name: "اجمل",
      fatherName: "نورآغا",
      idNo: "1400-107-46338",
      education: "لیسانس",
      infoForm: "ارائه شده",
      statusType: "سابقه",
      tin: "9005155800",
      criminalInquiry: "پاک",
      sanctions: "عدم موجودیت",
    },
    {
      id: 2,
      position: "کارمند نمایندگی",
      name: "محمد بشیر",
      fatherName: "عبدالکریم",
      idNo: "1398-1102-45211",
      education: "۱۴ پاس",
      infoForm: "ارائه شده",
      statusType: "سابقه",
      tin: "9012345678",
      criminalInquiry: "پاک",
      sanctions: "عدم موجودیت",
    },
    {
      id: 3,
      position: "کارمند نمایندگی",
      name: "احسان‌الله",
      fatherName: "غلام‌حضرت",
      idNo: "1401-0901-33214",
      education: "لیسانس",
      infoForm: "ارائه شده",
      statusType: "جدید",
      tin: "9022341122",
      criminalInquiry: "پاک",
      sanctions: "عدم موجودیت",
    },
    {
      id: 4,
      position: "کارمند نمایندگی",
      name: "نجیب‌الله",
      fatherName: "فضل‌احمد",
      idNo: "1402-0504-88912",
      education: "دوازدهم",
      infoForm: "ارائه شده",
      statusType: "سابقه",
      tin: "",
      criminalInquiry: "پاک",
      sanctions: "عدم موجودیت",
    },
  ],
  checklistItems: [
    { id: 1, text: "اصل جواز نمایندگی", status: "ارائه شده", note: "" },
    { id: 2, text: "فورم تمدید نمایندگی", status: "ارائه شده", note: "" },
    {
      id: 3,
      text: "درخواستی همراه با تصویب هیئت نظار",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 4,
      text: "آویز تحویلی تضمین: مبلغ 1,300,000 افغانی مراکز زونها / مبلغ 600,000 افغانی سایر ولایات و ولسوالی ها",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 5,
      text: "ارائه صورت حساب بانکی (استتمنت بابت سرمایه کاری: مبلغ 6.6 میلیون افغانی مراکز زونها / مبلغ 3.3 میلیون افغانی سایر ولایات و ولسوالی ها)",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 6,
      text: "عدم مسئولیت فنتراکا و نظارتی",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 7,
      text: "تصدیق صورت حساب بانکی بابت سرمایه کاری",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 8,
      text: "پاسخ استعلام اتحادیه در ارتباط به محل فعالیت نمایندگی صرافی و خدمات پولی",
      status: "ارائه شده",
      note: "",
    },
    {
      id: 9,
      text: "پاسخ ریاست مالیه دهنده گان/مستوفیت در قسمت عدم مسئولیت مالیاتی",
      status: "ارائه شده",
      note: "",
    },
  ],
};

const BRANCH_PRESETS = [
  {
    name: "نمایندگی 1: کابل (سرای شهزاده)",
    branchNo: "1 (کابل)",
    marketName: "مارکیت سرای شهزاده",
    shopNo: "منزل اول دکان 188",
    districtProvince: "ناحیه اول / کابل",
    repName: "اجمل احمدی",
    repFather: "نورآغا",
    repTazkira: "1400-107-46338",
  },
  {
    name: "نمایندگی 2: تخار (تالقان)",
    branchNo: "2 (تخار)",
    marketName: "صرافی صرافان تخار",
    shopNo: "دکان 12",
    districtProvince: "مرکز تالقان / تخار",
    repName: "رحمت‌الله",
    repFather: "فیض‌الله",
    repTazkira: "1400-1305-16532",
  },
  {
    name: "نمایندگی 3: کندز (امام‌صاحب)",
    branchNo: "3 (امام‌صاحب)",
    marketName: "مارکیت مرکزی صرافان",
    shopNo: "دکان 45",
    districtProvince: "امام‌صاحب / کندز",
    repName: "محمد یوسف",
    repFather: "عبدالمجید",
    repTazkira: "1399-1205-98680",
  },
  {
    name: "نمایندگی 4: بدخشان (کشم)",
    branchNo: "4 (کشم)",
    marketName: "مارکیت صرافان کشم",
    shopNo: "دکان 5",
    districtProvince: "کشم / بدخشان",
    repName: "عتیق‌الله",
    repFather: "شمس‌الدین",
    repTazkira: "7252",
  },
  {
    name: "نمایندگی 5: بدخشان (فیض‌آباد)",
    branchNo: "5 (فیض‌آباد)",
    marketName: "مارکیت مرکزی صرافان",
    shopNo: "دکان 10",
    districtProvince: "فیض‌آباد / بدخشان",
    repName: "نظام‌الدین",
    repFather: "محی‌الدین",
    repTazkira: "1399-1002-55412",
  },
  {
    name: "نمایندگی 6: بلخ (مزارشریف)",
    branchNo: "6 (مزارشریف)",
    marketName: "مارکیت سرای کفایت",
    shopNo: "دکان 24",
    districtProvince: "مزارشریف / بلخ",
    repName: "سمیع‌الله",
    repFather: "اسدالله",
    repTazkira: "1401-1502-99812",
  },
];

interface DabBranchRenewalChecklistProps {
  companyId?: string;
  isEditMode?: boolean;
  customLogo?: string | null;
  onOpenLogoModal?: () => void;
  onExportPdf?: () => void;
}

export default function DabBranchRenewalChecklist({
  isEditMode: initialEditMode = true,
  customLogo,
  onOpenLogoModal,
  onExportPdf,
  companyId = "default" }: DabBranchRenewalChecklistProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [data, setData] = useState<BranchRenewalChecklistData>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`bg_branch_renewal_checklist_v1_${companyId}`);
        if (saved)
          return { ...DEFAULT_BRANCH_RENEWAL_CHECKLIST, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_BRANCH_RENEWAL_CHECKLIST;
  });

  const [isSaved, setIsSaved] = useState(false);
  const [renderAll, setRenderAll] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`bg_branch_renewal_checklist_v1_${companyId}`);
        if (saved) {
          setData({ ...DEFAULT_BRANCH_RENEWAL_CHECKLIST, ...JSON.parse(saved) });
        } else {
          setData(DEFAULT_BRANCH_RENEWAL_CHECKLIST);
        }
      } catch (e) {
        console.error(e);
      }
    }
    try {
      const docRef = doc(db, "settings", `branch_renewal_checklist_v1_${companyId}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData?.checklistData) {
            setData((prev) => ({ ...prev, ...remoteData.checklistData }));
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn(e);
    }
  }, [companyId]);

  const handleSave = async () => {
    try {
      localStorage.setItem(
        `bg_branch_renewal_checklist_v1_${companyId}`,
        JSON.stringify(data),
      );
      const docRef = doc(db, "settings", `branch_renewal_checklist_v1_${companyId}`);
      await setDoc(
        docRef,
        { checklistData: data, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBranchPreset = (preset: (typeof BRANCH_PRESETS)[0]) => {
    setData((prev) => ({
      ...prev,
      branchNo: preset.branchNo,
      marketName: preset.marketName,
      shopNo: preset.shopNo,
      districtProvince: preset.districtProvince,
      staff: prev.staff.map((s, idx) =>
        idx === 0
          ? {
              ...s,
              name: preset.repName,
              fatherName: preset.repFather,
              idNo: preset.repTazkira,
            }
          : s,
      ),
    }));
  };

  const updateStaff = (
    id: number,
    field: keyof BranchStaffMember,
    value: any,
  ) => {
    setData((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const addStaff = () => {
    const newId = Date.now();
    setData((prev) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          id: newId,
          position: "کارمند نمایندگی",
          name: "",
          fatherName: "",
          idNo: "",
          education: "لیسانس",
          infoForm: "ارائه شده",
          statusType: "جدید",
          tin: "",
          criminalInquiry: "پاک",
          sanctions: "عدم موجودیت",
        },
      ],
    }));
  };

  const removeStaff = (id: number) => {
    if (data.staff.length <= 1) return;
    setData((prev) => ({
      ...prev,
      staff: prev.staff.filter((s) => s.id !== id),
    }));
  };

  const updateChecklistItem = (id: number, text: string) => {
    setData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
    }));
  };

  const addChecklistItem = () => {
    const newId = Date.now();
    setData((prev) => ({
      ...prev,
      checklistItems: [
        ...prev.checklistItems,
        {
          id: newId,
          text: "شرط جدید تمدید نمایندگی...",
          status: "ارائه شده",
          note: "",
        },
      ],
    }));
  };

  const removeChecklistItem = (id: number) => {
    if (data.checklistItems.length <= 1) return;
    setData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((item) => item.id !== id),
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
        elementId: "dab-branch-renewal-checklist-canvas",
        filename: `چک_لست_تمدید_نمایندگی_${data.companyName.replace(/\s+/g, "_")}_${data.branchNo}.pdf`,
        orientation: "portrait",
      });
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-md">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              چک لست جمع آوری اسناد تمدید نمایندگی شرکت
            </h2>
            <p className="text-[10px] text-slate-500">
              فرم اختصاصی ارزیابی و چک‌لست تمدید نمایندگی‌های شرکت صرافی و خدمات
              پولی برکت الله غفوری
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isEditing
                ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? "پیش‌نمایش نهایی" : "ویرایش فرم"}</span>
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors"
            >
              {isSaved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              {isSaved ? "ذخیره شد" : "ذخیره در سیستم"}
            </button>
          )}

          {isEditing && (
            <button
              onClick={() => {
                if (confirm("بازنشانی به داده‌های اولیه؟"))
                  setData(DEFAULT_BRANCH_RENEWAL_CHECKLIST);
              }}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"
              title="بازنشانی"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleExportPdf}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" /> PDF
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> چاپ
          </button>
        </div>
      </div>

      {/* Preset bar & Quick editing inputs in edit mode */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              بارگذاری سریع مشخصات نمایندگی:
            </span>
            
          <button
            onClick={() => setRenderAll(true)}
            className={`px-3 py-1.5 rounded-lg border font-bold text-[11px] ${
              renderAll ? 'bg-teal-600 text-white border-teal-700 shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500'
            }`}
          >
            همه نمایندگی‌ها (۶ فرم)
          </button>
          {BRANCH_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => { setRenderAll(false); loadBranchPreset(p); }}
              className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] ${
                (!renderAll && data.branchNo === p.branchNo) ? 'bg-slate-800 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500'
              }`} >

                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                شماره نمایندگی:
              </label>
              <input
                type="text"
                value={data.branchNo}
                onChange={(e) => setData({ ...data, branchNo: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام مارکیت:
              </label>
              <input
                type="text"
                value={data.marketName}
                onChange={(e) =>
                  setData({ ...data, marketName: e.target.value })
                }
                className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                شماره دکان:
              </label>
              <input
                type="text"
                value={data.shopNo}
                onChange={(e) => setData({ ...data, shopNo: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                ولسوالی / ولایت:
              </label>
              <input
                type="text"
                value={data.districtProvince}
                onChange={(e) =>
                  setData({ ...data, districtProvince: e.target.value })
                }
                className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

      {/* Main Document Canvas */}
      {(renderAll
        ? BRANCH_PRESETS.map((p) => ({
            ...data,
            branchNo: p.branchNo,
            marketName: p.marketName,
            shopNo: p.shopNo,
            districtProvince: p.districtProvince,
            staff: data.staff.map((s, idx) =>
              idx === 0
                ? {
                    ...s,
                    name: p.repName,
                    fatherName: p.repFather,
                    idNo: p.repTazkira,
                  }
                : s,
            ),
          }))
        : [data]
      ).map((branchData, index) => (
        <div
          key={index}
          id={
            renderAll
              ? `dab-branch-renewal-checklist-canvas-${index}`
              : "dab-branch-renewal-checklist-canvas"
          }
          className={`bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-xl space-y-8 font-sans print:shadow-none print:border-none print:p-0 ${renderAll ? "break-after-page mb-8 print:mb-0" : ""}`}
        >
          {/* Official Header */}
          <DabOfficialHeader
            storageKey={`branch_renewal_checklist_${companyId}`}
            governmentTitle="امارت اسلامی افغانستان"
            bankName="د افغانستان بانک"
            department="آمریت عمومی نظارت بر مؤسسات مالی غیر بانکی"
            directorate="مدیریت جوازدهی نمایندگی‌ها"
            formNumber=""
            formTitle="چک‌لیست معیاری اسناد و شرایط تمدید جواز فعالیت نمایندگی‌های ولایتی"
            companyName={branchData.companyName}
            licenseNo={branchData.licenseNo}
            guidelineText={`شرکت صرافی و خدمات پولی (${branchData.companyName}) — نمایندگی شماره (${branchData.branchNo}) واقع در ${branchData.marketName}، دکان شماره ${branchData.shopNo}، ولسوالی/ولایت ${branchData.districtProvince}`}
            logoUrl={customLogo}
            onOpenLogoModal={onOpenLogoModal}
            isEditable={true}
          />

          {/* Section 1: Checklist Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 border-r-4 border-teal-700 pr-3 uppercase">
                جدول اسناد و مدارک الزامی تمدید نمایندگی:
              </h3>
              {isEditing && (
                <button
                  onClick={addChecklistItem}
                  className="text-xs text-teal-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> افزودن بند جدید
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branchData.checklistItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-6 h-6 bg-teal-800 text-white rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  {isEditing ? (
                    <div className="flex-1 space-y-1">
                      <textarea
                        rows={2}
                        value={item.text}
                        onChange={(e) =>
                          updateChecklistItem(item.id, e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-medium"
                      />
                      {branchData.checklistItems.length > 1 && (
                        <button
                          onClick={() => removeChecklistItem(item.id)}
                          className="text-rose-600 text-[10px] font-bold flex items-center gap-0.5 hover:underline"
                        >
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
                    <div className="w-5 h-5 border-2 border-teal-700 rounded flex items-center justify-center bg-teal-50">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Staff & Representative Table */}
          <div className="space-y-3 pt-6 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2 border-r-4 border-blue-900 pr-3 text-blue-950 uppercase">
                مشخصات نماینده و کارمندان نمایندگی
              </h3>
              {isEditing && (
                <button
                  onClick={addStaff}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 font-bold flex items-center gap-1 hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" /> افزودن کارمند/نماینده
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-2xl shadow-xs">
              <table className="w-full text-[10px] text-right border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2 border border-slate-700 text-center">
                      موقف در نمایندگی
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      اسم
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      ولد
                    </th>
                    <th className="p-2 border border-slate-700 text-center w-10">
                      عکس
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      تذکره
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      سویه تحصیلی
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      فورم معلومات
                    </th>
                    <th className="p-2 border border-slate-700 text-center min-w-[90px]">
                      نماینده / کارمندان
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      نمبر تشخصیه (TIN) برویت سند
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      استعلام جنائی
                    </th>
                    <th className="p-2 border border-slate-700 text-center">
                      تطبیق لست های تعزیرات
                    </th>
                    {isEditing && (
                      <th className="p-2 border border-slate-700 text-center w-8 print:hidden">
                        حذف
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                  {branchData.staff.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-1.5 border border-slate-200 font-black text-slate-950">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.position}
                            onChange={(e) =>
                              updateStaff(p.id, "position", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] font-bold"
                          />
                        ) : (
                          <span
                            className={
                              p.position === "نماینده"
                                ? "text-teal-900 font-black"
                                : ""
                            }
                          >
                            {p.position}
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 font-bold">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) =>
                              updateStaff(p.id, "name", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px]"
                          />
                        ) : (
                          p.name
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.fatherName}
                            onChange={(e) =>
                              updateStaff(p.id, "fatherName", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px]"
                          />
                        ) : (
                          p.fatherName
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center">
                        <div className="w-7 h-9 border border-slate-300 rounded bg-slate-100 mx-auto" />
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.idNo}
                            onChange={(e) =>
                              updateStaff(p.id, "idNo", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] font-mono text-center"
                          />
                        ) : (
                          p.idNo
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.education}
                            onChange={(e) =>
                              updateStaff(p.id, "education", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] text-center"
                          />
                        ) : (
                          p.education
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.infoForm || ""}
                            onChange={(e) =>
                              updateStaff(p.id, "infoForm", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] text-center"
                          />
                        ) : (
                          p.infoForm || "-"
                        )}
                      </td>

                      {/* Status Type Column: جدید / سابقه */}
                      <td className="p-1.5 border border-slate-200 text-center font-bold">
                        {isEditing ? (
                          <select
                            value={p.statusType || "سابقه"}
                            onChange={(e) =>
                              updateStaff(
                                p.id,
                                "statusType",
                                e.target.value as any,
                              )
                            }
                            className="w-full p-1 border rounded text-[10px] bg-white font-bold text-center"
                          >
                            <option value="سابقه">سابقه</option>
                            <option value="جدید">جدید</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.statusType === "جدید"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-slate-100 text-slate-800 border border-slate-300"
                            }`}
                          >
                            {p.statusType || "سابقه"}
                          </span>
                        )}
                      </td>

                      <td className="p-1.5 border border-slate-200 text-center font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.tin || ""}
                            onChange={(e) =>
                              updateStaff(p.id, "tin", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] font-mono text-center"
                          />
                        ) : (
                          p.tin || "-"
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.criminalInquiry || ""}
                            onChange={(e) =>
                              updateStaff(
                                p.id,
                                "criminalInquiry",
                                e.target.value,
                              )
                            }
                            className="w-full p-1 border rounded text-[10px] text-center"
                          />
                        ) : (
                          p.criminalInquiry || "-"
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={p.sanctions || ""}
                            onChange={(e) =>
                              updateStaff(p.id, "sanctions", e.target.value)
                            }
                            className="w-full p-1 border rounded text-[10px] text-center"
                          />
                        ) : (
                          p.sanctions || "-"
                        )}
                      </td>
                      {isEditing && (
                        <td className="p-1.5 border border-slate-200 text-center print:hidden">
                          <button
                            onClick={() => removeStaff(p.id)}
                            className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                          >
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
                <p className="text-slate-700 leading-snug">
                  امضاء کارمند ولایتی
                  <br />
                  <span className="text-[9px] font-normal text-slate-500">
                    (در صورتیکه جواز مربوطه مربوط سایر ولایات باشد)
                  </span>
                </p>
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">
                  امضاء / تاریخ
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
                <p className="text-slate-700 leading-snug">
                  امضاء مدیر ارشد زون ساحوی
                  <br />
                  <span className="text-[9px] font-normal text-slate-500">
                    (در صورتیکه جواز متذکره مربوط زون ساحوی باشد)
                  </span>
                </p>
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">
                  امضاء / تاریخ
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
                <p className="text-slate-700 leading-snug">
                  امضاء مدیر جوازدهی
                </p>
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">
                  امضاء / تاریخ
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
                <p className="text-slate-700 leading-snug">
                  امضاء مدیر ارشد جوازدهی
                </p>
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">
                  امضاء / تاریخ
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between h-32">
                <p className="text-slate-700 leading-snug">امضاء معاون آمریت</p>
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-400 font-normal">
                  امضاء / تاریخ
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="pt-6 text-center text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
            <span>
              د افغانستان بانک - مدیریت عمومی جوازدهی صرافی و خدمات پولی
            </span>
            <span>صفحه ۱ از ۱ • چک‌لست تمدید نمایندگی</span>
          </div>
        </div>
      ))}
    </div>
  );
}
