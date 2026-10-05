'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Edit3, Save, RotateCcw, Download, Printer, ShieldCheck, Briefcase, 
  Users, UserCheck, Plus, Trash2, Check, FileSpreadsheet, Layers, Filter, CheckCircle2, 
  Search, FileCode, Loader2, Phone, Mail, Calendar, GraduationCap, IdCard, MapPin, 
  ChevronDown, ChevronUp, Maximize2, Minimize2, Database, Sparkles, Copy, ExternalLink, GitBranch, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { exportElementToPdf, exportElementToPng } from '@/lib/pdfExport';
import { exportElementToWord } from '@/lib/wordExport';
import { EmployeeRecord, subscribeEmployees, loadOrgChart, saveOrgChart } from '@/lib/supabaseData';
import DabOfficialHeader from './DabOfficialHeader';

export interface OrgChartNode {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  bgType?: 'dark' | 'light';
  staff?: string[];
  phone?: string;
  email?: string;
  joinDate?: string;
  education?: string;
  experience?: string;
  tazkiraNo?: string;
  location?: string;
  responsibilities?: string;
  tin?: string;
}

export interface OrgChartData {
  headerTitle: string;
  companyName: string;
  companySubEng: string;
  president: OrgChartNode;
  boardMembers: OrgChartNode[];
  executives: OrgChartNode[];
  branches: OrgChartNode[];
  reportingRows: { unit: string; reportsTo: string }[];
  footerNote: string;
}

const COMPLIANCE_OFFICER_CANONICAL: Partial<OrgChartNode> = {
  name: 'عبدالعزیز مهرزاد',
  title: 'مسئول پیروی از قوانین (Compliance Officer)',
  phone: '',
  email: '',
  joinDate: '',
  education: 'لیسانس اداره و تجارت',
  experience: 'مسئول مستقل پیروی از قوانین و مقررات و AML/CFT',
  tazkiraNo: '72198-0300-1401',
  location: 'دفتر مرکزی - واحد پیروی از قوانین و مقررات',
};

const normalizeOrgChartData = (value: OrgChartData): OrgChartData => ({
  ...value,
  executives: value.executives.map((executive) =>
    executive.title.includes('مسئول پیروی از قوانین')
      ? { ...executive, ...COMPLIANCE_OFFICER_CANONICAL }
      : executive
  ),
});

const TreeConnectors = ({ count, color = '#1e3a8a', isDarkTheme = false }: { count: number, color?: string, isDarkTheme?: boolean }) => {
  const bgColorClass = isDarkTheme ? 'bg-[#1e3a8a] dark:bg-blue-400' : 'bg-[#1e3a8a]';
  
  if (count <= 1) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className={`w-0.5 h-8 ${bgColorClass}`}></div>
      </div>
    );
  }

  const widthPercent = `${((count - 1) / count) * 100}%`;

  return (
    <div className="flex flex-col items-center w-full relative">
      <div className={`w-0.5 h-6 ${bgColorClass}`}></div>
      <div className={`h-0.5 ${bgColorClass} transition-all`} style={{ width: widthPercent }}></div>
      <div className="flex justify-between h-6 transition-all" style={{ width: widthPercent }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`w-0.5 h-full ${bgColorClass}`}></div>
        ))}
      </div>
    </div>
  );
};

const DEFAULT_ORG_CHART_DATA: OrgChartData = {
  headerTitle: 'چارت تشکیلاتی و ساختار سازمانی مصوب',
  companyName: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری (سهامی خاص)',
  companySubEng: 'ساختار تشکیلاتی و وظایف مصوب — د افغانستان بانک',
  
  president: {
    id: 'pres-1',
    name: 'برکت‌الله غفوری',
    title: 'رئیس و سهمدار اصلی (100٪ سرمایه)',
    bgType: 'dark',
    phone: '0799112030',
    email: 'b.ghafouri@exchange.af',
    joinDate: '1400/05/10',
    education: 'لیسانس کامپیوتر ساینس و مدیریت مالی',
    experience: 'بیش از 10 سال مدیریت ارشد صرافی، بانکداری و خدمات پولی',
    tazkiraNo: '1399-1104-55522',
    location: 'دفتر مرکزی - سرای شهزاده، کابل',
    responsibilities: 'تصمیم‌گیری‌های کلان استراتژیک، تأمین سرمایه و رهبری عالیه شرکت'
  },

  boardMembers: [
    {
      id: 'bm-1',
      name: 'عظیم‌الله رحمانی',
      title: 'عضو هیئت نظار',
      bgType: 'light',
      phone: '0777334050',
      email: 'azim.rahmani@exchange.af',
      joinDate: '1401/03/01',
      education: 'لیسانس حقوق و علوم سیاسی',
      experience: '6 سال سابقه امور حقوقی و نظارت شرکتی',
      tazkiraNo: '0054321-1504-12980',
      location: 'دفتر مرکزی - کابل',
      responsibilities: 'بررسی اسناد حقوقی و نظارت بر رعایت چارچوب‌های مقرراتی'
    },
    {
      id: 'bm-2',
      name: 'بسم‌الله شیرزی',
      title: 'رئیس هیئت نظار',
      bgType: 'dark',
      phone: '0788223040',
      email: 'bismillah.shirzai@exchange.af',
      joinDate: '1401/02/15',
      education: 'لیسانس اقتصاد و بانکداری',
      experience: '7 سال تجربه نظارت مالی و بانکی',
      tazkiraNo: '0087654-0201-34210',
      location: 'دفتر مرکزی - هیئت نظار',
      responsibilities: 'نظارت عالیه بر تطبیق قوانین DAB، بررسی گزارش‌های مالی و انطباق'
    },
    {
      id: 'bm-3',
      name: 'برکت‌الله',
      title: 'عضو هیئت نظار',
      bgType: 'light',
      phone: '0799112030',
      email: 'b.ghafouri@exchange.af',
      joinDate: '1400/05/10',
      education: 'لیسانس مدیریت مالی',
      experience: 'عضویت در هیئت نظار و نمایندگی سهمداران',
      tazkiraNo: '1399-1104-55522',
      location: 'دفتر مرکزی - کابل',
      responsibilities: 'هماهنگی امور نظارتی و نظارت مستقیم بر فعالیت‌های اجرایی'
    }
  ],

  executives: [
    {
      id: 'exec-1',
      name: 'عبدالعزیز مهرزاد',
      title: 'مسئول پیروی از قوانین (Compliance Officer)',
      bgType: 'dark',
      phone: '0799887766',
      email: 'compliance@exchange.af',
      joinDate: '1401/01/10',
      education: 'لیسانس اداره و تجارت',
      experience: 'مسئول مستقل پیروی از قوانین و مقررات و AML/CFT',
      tazkiraNo: '72198-0300-1401',
      location: 'دفتر مرکزی - واحد پیروی از قوانین و مقررات',
      responsibilities: 'پایش معاملات مشکوک (STR/LCTR)، احراز هویت مشتریان (KYC) و گزارش‌دهی مستقیم به هیئت نظار و د افغانستان بانک'
    },
    {
      id: 'exec-2',
      name: 'صالح‌محمد',
      title: 'مسئول اجرائیه / مدیر عملیاتی (Operations Manager)',
      bgType: 'dark',
      phone: '0790556070',
      email: 'operations@exchange.af',
      joinDate: '1401/04/10',
      education: 'لیسانس اداره و تجارت (BBA)',
      experience: '6 سال مدیریت عملیات صرافی و حواله‌جات پولی',
      tazkiraNo: '0098712-1203-65432',
      location: 'دفتر مرکزی - مدیریت عملیات',
      responsibilities: 'نظارت بر کلیه نمایندگی‌های ولایتی، کنترل نقدینگی و تسویه‌حساب‌های روزانه'
    },
    {
      id: 'exec-3',
      name: 'صدیق‌الله',
      title: 'مدیر مالی و حسابداری (Finance Manager)',
      bgType: 'dark',
      phone: '0778899001',
      email: 'finance@exchange.af',
      joinDate: '1401/05/15',
      education: 'فوق دیپلم محاسبات مالی و بانکی',
      experience: '5 سال سابقه امور مالی و حسابداری صرافی',
      tazkiraNo: '0043210-1401-98765',
      location: 'دفتر مرکزی - مدیریت مالی',
      responsibilities: 'تنظیم دفتر کل، صورت‌های مالی روزانه، ترازنامه و گزارش‌دهی مالی به د افغانستان بانک'
    },
    {
      id: 'exec-4',
      name: 'ریحان داخلی',
      title: 'مدیر اداری و منابع بشری (Admin & HR Manager)',
      bgType: 'dark',
      phone: '0789012345',
      email: 'hr@exchange.af',
      joinDate: '1401/06/01',
      education: 'لیسانس حقوق و علوم اداری',
      experience: '4 سال مدیریت پرسنل و امور اداری',
      tazkiraNo: '0056789-1102-34567',
      location: 'دفتر مرکزی - مدیریت اداری',
      responsibilities: 'تنظیم سوابق پرسنلی، قراردادهای کاری، مراسلات اداری و صیانت از اسناد شرکت'
    }
  ],

  branches: [
    {
      id: 'br-1',
      name: 'نمایندگی کابل',
      title: 'اجمل احمدی (مدیر نمایندگی)',
      staff: ['ریحان داخلی (خزانه‌دار)', 'صدیق‌الله (مسئول حواله‌جات)'],
      bgType: 'light',
      phone: '0700123456',
      email: 'kabul.branch@exchange.af',
      joinDate: '1401/08/01',
      education: 'بکلوریا / دوره عالی حسابداری',
      tazkiraNo: '0065432-1101-43210',
      location: 'کابل، سرای شهزاده، طبقه دوم',
      responsibilities: 'مدیریت امور صرافی و حواله‌های پایتخت و کنترل گاوصندوق'
    },
    {
      id: 'br-2',
      name: 'نمایندگی تخار',
      title: 'رحمت‌الله (مدیر نمایندگی)',
      staff: ['عبیدالله (متصدی خدمات)'],
      bgType: 'light',
      phone: '0701654321',
      email: 'takhar.branch@exchange.af',
      joinDate: '1401/09/15',
      education: 'فوق دیپلم اقتصاد',
      tazkiraNo: '0041526-1402-87211',
      location: 'تالقان، چوک مرکزی، مارکیت صرافان',
      responsibilities: 'ارائه خدمات پولی، تبادله اسعار و حواله‌جات ولایت تخار'
    },
    {
      id: 'br-3',
      name: 'نمایندگی کشم',
      title: 'عتیق‌الله (مدیر نمایندگی)',
      staff: ['نورمحمد (همکار اداری)'],
      bgType: 'light',
      phone: '0702987654',
      email: 'keshem.branch@exchange.af',
      joinDate: '1402/02/01',
      education: 'بکلوریا',
      tazkiraNo: '0032918-1501-23145',
      location: 'بدخشان، ولسوالی کشم، بازار مرکزی',
      responsibilities: 'ارائه خدمات انتقال و دریافت حواله مشتریان محلی'
    },
    {
      id: 'br-4',
      name: 'نمایندگی امام صاحب',
      title: 'محمد یوسف حیدری (مدیر نمایندگی)',
      staff: ['عبدالمجید (خزانه‌دار)'],
      bgType: 'light',
      phone: '0703456789',
      email: 'imamsaheb.branch@exchange.af',
      joinDate: '1402/04/10',
      education: 'لیسانس اقتصاد',
      tazkiraNo: '0076543-1303-99812',
      location: 'کندز، ولسوالی امام صاحب، مارکیت تجارتی',
      responsibilities: 'مدیریت حواله‌جات مرزی و تسویه روزانه با مرکز'
    }
  ],

  reportingRows: [
    { unit: 'هیئت نظار (Board of Supervisors)', reportsTo: 'مجمع عمومی سهمداران / هیئت مدیره (نظارت عالیه و کنترل داخلی)' },
    { unit: 'مدیر اجرائیه / مسئول عملیاتی', reportsTo: 'رئیس هیئت مدیره / سهمدار اصلی (رهبری اجرایی و مدیریت عملیات)' },
    { unit: 'مسئول پیروی از قوانین (Compliance - AML/CFT)', reportsTo: 'هیئت نظار / هیئت مدیره (با استقلال انطباقی کامل طبق لایحه DAB)' },
    { unit: 'مدیریت مالی و حسابداری', reportsTo: 'مدیر اجرائیه (گزارش‌دهی مالی، حسابداری و صورت‌های مالی)' },
    { unit: 'مدیریت اداری و منابع بشری', reportsTo: 'مدیر اجرائیه (امور پرسنلی، مراسلات و صیانت از اسناد)' },
    { unit: 'نماینده‌ها و مسئولین نمایندگی‌های ولایتی', reportsTo: 'مدیر عملیات و معاملات (اجرای روزمره صرافی و حواله‌جات)' },
    { unit: 'کارکنان و خزانه‌داران شعب ولایتی', reportsTo: 'مسئول نمایندگی مربوطه' }
  ],

  footerNote: '▸ نکته مقرراتی د افغانستان بانک: هیئت نظار متضمن کنترل داخلی، نظارت بر گزارش‌های مالی و تطبیق احکام مقرره لایحه صرافی‌ها و خدمات پولی می‌باشد. واحد پیروی از قوانین (Compliance) دارای استقلال کامل در گزارش‌دهی امور AML/CFT به د افغانستان بانک می‌باشد.'
};

interface OrgChartCanvasProps {
  companyId?: string;
  customLogo?: string | null;
  isEditMode?: boolean;
  searchTerm?: string;
}

export default function OrgChartCanvas({
  customLogo,
  companyId = "default",
  isEditMode: externalIsEditMode,
  searchTerm: externalSearchTerm,
}: OrgChartCanvasProps) {
  const [data, setData] = useState<OrgChartData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_org_chart_v2_${companyId}`);
        if (saved) return normalizeOrgChartData({ ...DEFAULT_ORG_CHART_DATA, ...JSON.parse(saved) });
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ORG_CHART_DATA;
  });

  const [dbEmployees, setDbEmployees] = useState<EmployeeRecord[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [internalIsEditMode, setInternalIsEditMode] = useState(false);

  const toggleBranchCollapse = (branchKey: string) => {
    setCollapsedBranches((prev) => ({
      ...prev,
      [branchKey]: !prev[branchKey],
    }));
  };

  const hasCollapsedBranches = Object.values(collapsedBranches).some(Boolean);

  const toggleAllBranchesCollapse = () => {
    if (hasCollapsedBranches) {
      setCollapsedBranches({});
    } else {
      setCollapsedBranches({
        president: true,
        board: true,
        branches: true,
      });
    }
  };
  const isEditMode = externalIsEditMode !== undefined ? externalIsEditMode : internalIsEditMode;
  const setIsEditMode = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === 'function') {
      setInternalIsEditMode((prev) => val(isEditMode));
    } else {
      setInternalIsEditMode(val);
    }
  };

  const [pdfQualityScale, setPdfQualityScale] = useState<number>(3.5); // Default high resolution Ultra (DPI ~350)
  const [paperSizeOption, setPaperSizeOption] = useState<'a4' | 'a3'>('a3'); // Default A3 for wide org charts
  const [staffCapacityThreshold, setStaffCapacityThreshold] = useState<number>(3); // Configurable branch staff capacity limit
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = setInternalSearchTerm;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync with Firestore Org Chart Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bg_org_chart_v2_${companyId}`);
        if (saved) {
          setData(normalizeOrgChartData({ ...DEFAULT_ORG_CHART_DATA, ...JSON.parse(saved) }));
        } else {
          setData(DEFAULT_ORG_CHART_DATA);
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadOrgChart(companyId)
      .then((remote) => {
        if (remote) {
          setData((prev) => normalizeOrgChartData({ ...prev, ...(remote as Partial<OrgChartData>) }));
        }
      })
      .catch((e) => console.warn('Supabase org chart load fallback', e));
  }, [companyId]);

  // Subscribe to Employees from Firestore to enrich nodes live
  useEffect(() => {
    try {
      const unsubscribe = subscribeEmployees((empList) => {
        setDbEmployees(empList || []);
      }, companyId);
      return () => unsubscribe();
    } catch (e) {
      console.warn('Employees sync fallback', e);
    }
  }, [companyId]);

  // Helper to find matched employee record from database
  const getMatchedEmployee = (node: OrgChartNode): EmployeeRecord | null => {
    if (!dbEmployees.length) return null;
    const normalizedNodeName = node.name.trim().toLowerCase();
    const normalizedNodeTitle = node.title.trim().toLowerCase();

    return dbEmployees.find(emp => {
      const empName = emp.fullName.trim().toLowerCase();
      const empPos = emp.position.trim().toLowerCase();
      return (
        empName.includes(normalizedNodeName) ||
        normalizedNodeName.includes(empName) ||
        (empPos && normalizedNodeTitle.includes(empPos)) ||
        emp.id === node.id
      );
    }) || null;
  };

  // Merge node fields with Firestore employee database if available
  const getEnrichedNode = (node: OrgChartNode): OrgChartNode & { hasDbMatch: boolean } => {
    const match = getMatchedEmployee(node);
    if (!match) return { ...node, hasDbMatch: false };

    return {
      ...node,
      phone: node.phone || match.phone || undefined,
      email: node.email || match.email || undefined,
      joinDate: node.joinDate || match.formDate || undefined,
      education: node.education || match.education || undefined,
      experience: node.experience || match.experience || undefined,
      tazkiraNo: node.tazkiraNo || match.tazkiraNo || undefined,
      tin: node.tin || match.tin || undefined,
      hasDbMatch: true
    };
  };

  const isNodeMatch = (name: string, title: string, id: string) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase().trim();
    return (
      name.toLowerCase().includes(term) ||
      title.toLowerCase().includes(term) ||
      id.toLowerCase().includes(term)
    );
  };

  const getNodeHighlightClass = (name: string, title: string, id: string) => {
    if (!searchTerm.trim()) return '';
    const match = isNodeMatch(name, title, id);
    return match
      ? 'ring-4 ring-amber-400 ring-offset-2 scale-[1.02] transition-all duration-300 bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-2xl z-10'
      : 'opacity-30 transition-all duration-300';
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodeIds(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const getAllNodeIds = (): string[] => {
    const ids: string[] = [data.president.id];
    data.boardMembers.forEach(bm => ids.push(bm.id));
    data.executives.forEach(ex => ids.push(ex.id));
    data.branches.forEach(br => ids.push(br.id));
    return ids;
  };

  const expandAllNodes = () => {
    const all = getAllNodeIds();
    const nextState: Record<string, boolean> = {};
    all.forEach(id => { nextState[id] = true; });
    setExpandedNodeIds(nextState);
  };

  const collapseAllNodes = () => {
    setExpandedNodeIds({});
  };

  const expandedCount = Object.values(expandedNodeIds).filter(Boolean).length;
  const totalNodesCount = getAllNodeIds().length;

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(`bg_org_chart_v2_${companyId}`, JSON.stringify(data));
      try {
        await saveOrgChart(data, companyId);
      } catch (e) {
        console.warn('Supabase org chart write fallback', e);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error('Save error', e);
    }
  };

  const handleReset = () => {
    if (window.confirm('آیا از بازنشانی چارت تشکیلاتی به حالت مطابق سند رسمی اطمینان دارید؟')) {
      setData(DEFAULT_ORG_CHART_DATA);
      setExpandedNodeIds({});
      localStorage.removeItem(`bg_org_chart_v2_${companyId}`);
    }
  };

  const handleImageExport = async () => {
    const previousCollapsed = { ...collapsedBranches };
    setCollapsedBranches({}); // Expand all branches for full export
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const ok = await exportElementToPng({
        elementId: 'org-chart-export-canvas',
        filename: `چارت_سازمانی_شرکت_صرافی_DPI${Math.round(pdfQualityScale * 96)}.png`,
        qualityScale: pdfQualityScale
      });
      if (!ok) {
        alert('خطا در دانلود تصویر PNG.');
      }
    } catch (error) {
      console.error(error);
      alert('خطا در دانلود تصویر PNG.');
    } finally {
      setCollapsedBranches(previousCollapsed);
      setIsExporting(false);
    }
  };

  const handlePdfExport = async () => {
    const previousCollapsed = { ...collapsedBranches };
    setCollapsedBranches({}); // Expand all branches for full export
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await exportElementToPdf({
        elementId: 'org-chart-export-canvas',
        filename: `چارت_سازمانی_شرکت_صرافی_${paperSizeOption.toUpperCase()}_DPI${Math.round(pdfQualityScale * 96)}.pdf`,
        paperSize: paperSizeOption,
        orientation: 'landscape',
        qualityScale: pdfQualityScale
      });
    } catch (error) {
      console.error(error);
      alert('خطا در دانلود فایل PDF.');
    } finally {
      setCollapsedBranches(previousCollapsed);
      setIsExporting(false);
    }
  };

  const handleWordExport = async () => {
    const previousCollapsed = { ...collapsedBranches };
    setCollapsedBranches({}); // Expand all branches for full export
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await exportElementToWord({
        elementId: 'org-chart-exact-canvas',
        filename: 'چارت_سازمانی_شرکت_صرافی.doc',
        title: 'چارت تشکیلاتی و ساختار سازمانی شرکت صرافی',
        orientation: 'portrait'
      });
    } catch (error) {
      console.error(error);
      alert('خطا در دانلود فایل Word.');
    } finally {
      setCollapsedBranches(previousCollapsed);
      setIsExporting(false);
    }
  };

  // Reusable Interactive Node Card Component with Click-to-Expand & Sub-Branch Collapse
  const renderInteractiveNodeCard = ({
    node,
    variant = 'standard',
    isDark = false,
    badgeText,
    subtitleOverride,
    customClass = '',
    hasSubBranches = false,
    isSubBranchCollapsed = false,
    onToggleSubBranch,
    subBranchCount,
    subBranchLabel,
    reportsTo
  }: {
    node: OrgChartNode;
    variant?: 'president' | 'board' | 'executive' | 'branch' | 'standard';
    isDark?: boolean;
    badgeText?: string;
    subtitleOverride?: string;
    customClass?: string;
    hasSubBranches?: boolean;
    isSubBranchCollapsed?: boolean;
    onToggleSubBranch?: () => void;
    subBranchCount?: number;
    subBranchLabel?: string;
    reportsTo?: string;
  }) => {
    const isExpanded = !!expandedNodeIds[node.id];
    const enriched = getEnrichedNode(node);
    const highlightClass = getNodeHighlightClass(node.name, node.title, node.id);

    const hasExtraDetails = !!(
      enriched.phone || 
      enriched.email || 
      enriched.joinDate || 
      enriched.education || 
      enriched.experience || 
      enriched.tazkiraNo || 
      enriched.location || 
      enriched.responsibilities ||
      (node.staff && node.staff.length > 0)
    );

    const staffCount = node.staff?.length || 0;
    const isOverCapacity = staffCount > staffCapacityThreshold;
    const isNearCapacity = staffCount === staffCapacityThreshold && staffCapacityThreshold > 0;

    let badgeBgClasses = "bg-slate-900/85 text-white border-white/25 shadow-xs";
    let topBadgeIcon = <Users className="w-2.5 h-2.5 text-blue-200" />;
    let bodyBadgeIcon = <Users className="w-3 h-3 text-blue-200" />;
    let topBadgeText = `پرسنل: ${staffCount} نفر`;
    let bodyBadgeText = `ظرفیت پرسنل: ${staffCount} نفر`;

    if (isOverCapacity) {
      badgeBgClasses = "bg-rose-900/95 text-rose-100 border-rose-400/80 shadow-md shadow-rose-950/40 ring-2 ring-rose-500/50";
      topBadgeIcon = <AlertTriangle className="w-2.5 h-2.5 text-rose-300 animate-pulse" />;
      bodyBadgeIcon = <AlertTriangle className="w-3 h-3 text-rose-300 animate-bounce" />;
      topBadgeText = `هشدار مازاد: ${staffCount}/${staffCapacityThreshold} نفر`;
      bodyBadgeText = `مازاد بر سقف مجاز (${staffCount}/${staffCapacityThreshold} نفر)`;
    } else if (isNearCapacity) {
      badgeBgClasses = "bg-amber-900/95 text-amber-100 border-amber-400/80 shadow-xs ring-1 ring-amber-400/40";
      topBadgeIcon = <Users className="w-2.5 h-2.5 text-amber-300" />;
      bodyBadgeIcon = <Users className="w-3 h-3 text-amber-300" />;
      topBadgeText = `تکمیل ظرفیت: ${staffCount}/${staffCapacityThreshold} نفر`;
      bodyBadgeText = `سقف ظرفیت تکمیل شد (${staffCount}/${staffCapacityThreshold} نفر)`;
    }

    let topAccentGradient = 'bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600';
    if (variant === 'president') {
      topAccentGradient = 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600';
    } else if (variant === 'board') {
      topAccentGradient = 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600';
    } else if (variant === 'branch') {
      topAccentGradient = 'bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500';
    }

    return (
      <div 
        id={`org-node-${node.id}`}
        onClick={() => toggleNodeExpand(node.id)}
        className={`
          group relative transition-all duration-300 ease-out cursor-pointer rounded-2xl select-none overflow-hidden
          ${isDark 
            ? 'bg-slate-900 text-white border border-blue-800/80 shadow-md hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1' 
            : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs hover:shadow-xl hover:border-blue-500 hover:-translate-y-1'
          }
          ${isExpanded 
            ? 'ring-2 ring-blue-500 shadow-xl z-20 ' + (isDark ? 'bg-slate-850' : 'bg-blue-50/20 dark:bg-slate-850') 
            : ''
          }
          ${highlightClass}
          ${customClass}
        `}
      >
        {/* Top Role Gradient Accent Bar */}
        <div className={`h-1.5 w-full ${topAccentGradient}`} />

        {/* Print-Only 'Report To' Hierarchy Edge Badge */}
        {reportsTo && (
          <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
            <span className="text-amber-300 font-black">گزارش به:</span>
            <span className="font-bold">{reportsTo}</span>
          </div>
        )}
        {/* Custom Hover Tooltip */}
        <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-50 text-right dir-rtl print:hidden">
          {/* Tooltip Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 border-b border-r border-slate-700/80 rotate-45" />

          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
              <IdCard className="w-3.5 h-3.5 text-blue-400" />
              <span>مشخصات تماس و پرسنلی</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-950/80 text-blue-200 px-2 py-0.5 rounded-full border border-blue-800">
              کد: {node.id}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="font-black text-white text-xs truncate">{node.name}</div>
            <div className="text-slate-300 text-[10px] truncate">{subtitleOverride || node.title}</div>

            <div className="pt-2 space-y-1.5 border-t border-slate-800/80 text-[10px]">
              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400" />
                  <span>شماره تماس:</span>
                </span>
                <span className="font-mono dir-ltr font-bold text-slate-100">
                  {enriched.phone || 'ثبت نشده'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-sky-400" />
                  <span>پست الکترونیک:</span>
                </span>
                <span className="font-mono dir-ltr text-slate-100 truncate max-w-[130px]">
                  {enriched.email || 'ثبت نشده'}
                </span>
              </div>

              {(enriched.tazkiraNo || enriched.tin) && (
                <div className="flex items-center justify-between gap-2 text-slate-300 pt-1 border-t border-slate-800/50">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>تذکره / کد مالیاتی:</span>
                  </span>
                  <span className="font-mono text-slate-100">{enriched.tazkiraNo || enriched.tin}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Badges Bar */}
        {(enriched.hasDbMatch || badgeText || variant === 'branch' || (node.staff && node.staff.length > 0)) && (
          <div className="pt-2.5 px-4 flex items-center justify-between gap-1.5 text-[9px] print:hidden">
            <div className="flex items-center gap-1.5">
              {enriched.hasDbMatch && (
                <span 
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700"
                  title="متصل به دیتابیس زنده سوانح پرسنل (Firestore Database)"
                >
                  <Database className="w-2.5 h-2.5 text-blue-500" />
                  <span>دیتابیس</span>
                </span>
              )}
              {badgeText && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  isDark 
                    ? 'bg-blue-900/90 text-blue-100 border-blue-700' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}>
                  {badgeText}
                </span>
              )}
            </div>

            {(variant === 'branch' || (node.staff && node.staff.length > 0)) && (
              <span 
                className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${badgeBgClasses}`}
                title={`تعداد پرسنل: ${staffCount} نفر (سقف مجاز: ${staffCapacityThreshold} نفر)`}
              >
                {topBadgeIcon}
                <span>{topBadgeText}</span>
              </span>
            )}
          </div>
        )}

        {/* Card Header Content */}
        <div className="p-4 sm:p-5 text-center">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="w-6" /> {/* spacer */}
            <div className={`font-black tracking-tight ${variant === 'president' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
              {node.name}
            </div>
            {/* Click-to-Expand Indicator Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpand(node.id);
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all print:hidden ${
                isDark 
                  ? 'bg-blue-900/80 hover:bg-blue-800 text-blue-200' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300'
              }`}
              title={isExpanded ? 'بستن مشخصات' : 'کلیک برای مشاهده مشخصات، تماس و تاریخ استخدام'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className={`text-xs sm:text-sm font-bold ${isDark ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
            {subtitleOverride || node.title}
          </div>

          {/* Branch Staff Capacity Badge */}
          {(variant === 'branch' || (node.staff && node.staff.length > 0)) && (
            <div className="mt-2 flex justify-center">
              <span 
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-0.5 rounded-full backdrop-blur-md border transition-all duration-300 animate-in fade-in ease-out group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:shadow-md ${badgeBgClasses}`}
                title="برنامه‌ریزی ظرفیت نیروی انسانی نمایندگی"
              >
                {bodyBadgeIcon}
                <span>{bodyBadgeText}</span>
              </span>
            </div>
          )}

          {/* Quick Collapse/Expand CTA chip */}
          <div className="mt-2.5 flex items-center justify-center gap-2 print:hidden">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
              isExpanded 
                ? isDark 
                  ? 'bg-blue-950/80 text-blue-200 border border-blue-700' 
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : isDark 
                  ? 'text-blue-300/80 group-hover:text-white' 
                  : 'text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-300'
            }`}>
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  <span>بستن مشخصات</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3" />
                  <span>اطلاعات تماس و سوابق</span>
                </>
              )}
            </span>
          </div>

          {/* Dedicated Sub-Branch Collapse Button */}
          {hasSubBranches && onToggleSubBranch && (
            <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/60 flex justify-center print:hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubBranch();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
                  isSubBranchCollapsed
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs animate-pulse'
                    : isDark
                      ? 'bg-blue-950/90 hover:bg-blue-900 text-blue-200 border-blue-700/80'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-300 dark:border-slate-700'
                }`}
                title={isSubBranchCollapsed ? 'نمایش شاخه زیرمجموعه' : 'بستن و فشرده‌سازی شاخه زیرمجموعه'}
              >
                {isSubBranchCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>نمایش {subBranchLabel || 'شاخه زیرمجموعه'} ({subBranchCount ?? ''})</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>بستن {subBranchLabel || 'شاخه زیرمجموعه'} ({subBranchCount ?? ''})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* EXPANDED CONTENT TRAY (Unfolds when clicked) */}
        {isExpanded && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className={`border-t px-4 py-4 space-y-3 text-right text-xs rounded-b-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${
              isDark 
                ? 'border-blue-800/80 bg-blue-950/70 text-slate-100' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 text-slate-800 dark:text-slate-200'
            }`}
          >
            {/* Database Connection Notice */}
            <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] print:hidden ${
              enriched.hasDbMatch 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>{enriched.hasDbMatch ? 'همگام‌سازی شده با سوانح پرسنل دیتابیس' : 'مشخصات تشکیلاتی و انطباق DAB'}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{node.id}</span>
            </div>

            {/* Grid of Key Extended Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Phone Field */}
              {enriched.phone && (
                <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] opacity-70 block font-semibold">شماره تماس:</span>
                      <a 
                        href={`tel:${enriched.phone}`} 
                        className="font-bold font-mono text-xs hover:underline ltr inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {enriched.phone}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyText(enriched.phone!, 'phone')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-700"
                    title="کپی شماره تماس"
                  >
                    {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {/* Email Field */}
              {enriched.email && (
                <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] opacity-70 block font-semibold">ایمیل سازمانی:</span>
                      <a 
                        href={`mailto:${enriched.email}`} 
                        className="font-semibold font-mono text-[11px] hover:underline ltr inline-block truncate max-w-[130px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {enriched.email}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyText(enriched.email!, 'email')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-700"
                    title="کپی ایمیل"
                  >
                    {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {/* Joining Date Field */}
              {enriched.joinDate && (
                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] opacity-70 block font-semibold">تاریخ استخدام / شروع فعالیت:</span>
                    <span className="font-bold text-xs font-mono">{enriched.joinDate}</span>
                  </div>
                </div>
              )}

              {/* Tazkira / ID Number */}
              {enriched.tazkiraNo && (
                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <IdCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-[10px] opacity-70 block font-semibold">نمبر تذکره / هویت:</span>
                    <span className="font-semibold text-xs font-mono">{enriched.tazkiraNo}</span>
                  </div>
                </div>
              )}

              {/* Education */}
              {enriched.education && (
                <div className={`p-2 rounded-xl border flex items-center gap-2 col-span-1 sm:col-span-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[10px] opacity-70 block font-semibold">تحصیلات و تخصص:</span>
                    <span className="font-semibold text-xs">{enriched.education}</span>
                  </div>
                </div>
              )}

              {/* Location */}
              {enriched.location && (
                <div className={`p-2 rounded-xl border flex items-center gap-2 col-span-1 sm:col-span-2 ${
                  isDark ? 'bg-blue-900/50 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <div>
                    <span className="text-[10px] opacity-70 block font-semibold">موقعیت و محل خدمت:</span>
                    <span className="font-semibold text-xs">{enriched.location}</span>
                  </div>
                </div>
              )}

              {/* Responsibilities & AML/CFT Compliance Role */}
              {enriched.responsibilities && (
                <div className={`p-2.5 rounded-xl border col-span-1 sm:col-span-2 space-y-1 ${
                  isDark ? 'bg-blue-950 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>حیطه اختیارات و مسئولیت‌های سازمانی (DAB):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{enriched.responsibilities}</p>
                </div>
              )}

              {/* Staff / Personnel under node */}
              {node.staff && node.staff.length > 0 && (
                <div className={`p-2.5 rounded-xl border col-span-1 sm:col-span-2 space-y-1 ${
                  isDark ? 'bg-blue-950 border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>کارکنان و کادر اجرایی همکار:</span>
                  </div>
                  <div className="text-[11px] font-semibold flex flex-wrap gap-1.5 pt-0.5">
                    {node.staff.map((s, sIdx) => (
                      <span key={sIdx} className="bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Collapse Trigger */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpand(node.id);
                }}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-300 hover:underline flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" />
                <span>بستن این بخش</span>
              </button>
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 dir-rtl">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>چارت تشکیلاتی رسمی و هیئت نظار</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-full font-normal">
                قابلیت کلیک برای گسترش جزئیات
              </span>
            </h2>
            <p className="text-xs text-slate-500">برای مشاهده شماره تماس، ایمیل، تاریخ استخدام و سوابق، روی هر کارت کلیک کنید.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dedicated Search Bar */}
          <div className="relative flex items-center min-w-[200px] sm:min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی پرسنل (نام، سمت، شناسه)..."
              className="w-full pl-8 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Expand / Collapse All Toggle */}
          <button
            onClick={expandedCount > 0 ? collapseAllNodes : expandAllNodes}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title={expandedCount > 0 ? 'بستن مشخصات کارت‌ها' : 'باز کردن مشخصات و سوابق کارت‌ها'}
          >
            {expandedCount > 0 ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4 text-blue-600" />}
            <span>{expandedCount > 0 ? `بستن مشخصات` : 'نمایش جزئیات'}</span>
          </button>

          {/* Toggle Branch Collapse Button */}
          <button
            onClick={toggleAllBranchesCollapse}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              hasCollapsedBranches
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title={hasCollapsedBranches ? 'باز کردن تمام شاخه‌های بسته‌شده' : 'فشرده‌سازی تمام شاخه‌های زیرمجموعه'}
          >
            <GitBranch className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{hasCollapsedBranches ? 'باز کردن همه شاخه‌ها' : 'فشرده‌سازی شاخه‌ها'}</span>
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isEditMode
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditMode ? 'تکمیل ویرایش' : 'ویرایش چارت'}</span>
          </button>

          {isEditMode && (
            <button
              onClick={handleSave}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'ذخیره شد' : 'ذخیره در دیتابیس'}</span>
            </button>
          )}

          <button
            onClick={handleWordExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            title="استخراج به مایکروسافت ورد"
          >
            <FileCode className="w-4 h-4 text-blue-200" />
            <span>{isExporting ? 'در حال خروجی...' : 'دانلود Word'}</span>
          </button>

          {/* Configurable Staff Capacity Threshold Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700" title="تنظیم سقف پرسنل جهت مدیریت منابع و هشدار ظرفیت نمایندگی‌ها">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1 hidden sm:inline" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">سقف پرسنل:</span>
            <select
              value={staffCapacityThreshold}
              onChange={(e) => setStaffCapacityThreshold(parseInt(e.target.value, 10))}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value={2}>سقف: ۲ نفر</option>
              <option value={3}>سقف: ۳ نفر (پیش‌فرض)</option>
              <option value={4}>سقف: ۴ نفر</option>
              <option value={5}>سقف: ۵ نفر</option>
              <option value={8}>سقف: ۸ نفر</option>
              <option value={10}>سقف: ۱۰ نفر</option>
            </select>
          </div>

          {/* Quality DPI & Paper Size Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pr-1.5 hidden sm:inline">کیفیت:</span>
            <select
              value={pdfQualityScale}
              onChange={(e) => setPdfQualityScale(parseFloat(e.target.value))}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              title="تنظیم رزولوشن و DPI تصویر چارت در PDF"
            >
              <option value={2.0}>استاندارد (DPI 192)</option>
              <option value={3.5}>عالی - کیفیت چاپ HD (DPI 336)</option>
              <option value={4.5}>فوق‌العاده - چاپ بزرگ Ultra (DPI 432)</option>
            </select>

            <select
              value={paperSizeOption}
              onChange={(e) => setPaperSizeOption(e.target.value as 'a4' | 'a3')}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              title="اندازه کاغذ PDF"
            >
              <option value="a3">کاغذ A3 افقی (پیشنهادی)</option>
              <option value="a4">کاغذ A4 افقی</option>
            </select>
          </div>

          <button
            onClick={handleImageExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            title="دانلود تصویر چارت با کیفیت بالا (PNG)"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{isExporting ? 'در حال خروجی...' : 'دانلود تصویر (PNG)'}</span>
          </button>

          <button
            onClick={handlePdfExport}
            disabled={isExporting}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'در حال خروجی کیفیت بالا...' : 'دانلود PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer"
            title="بازنشانی به حالت پیش‌فرض"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Edit Controls Form */}
      {isEditMode && (
        <div className="bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 text-xs print:hidden">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 border-b border-blue-200 pb-2">
            <Edit3 className="w-4 h-4" />
            <span>ویرایش عنوان‌ها، سربرگ و مشخصات چارت تشکیلاتی</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
            <div>
              <label className="font-bold block mb-1 text-xs">عنوان سربرگ چارت:</label>
              <input
                type="text"
                value={data.headerTitle}
                onChange={(e) => setData({ ...data, headerTitle: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-bold text-xs"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-xs">نام شرکت:</label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => setData({ ...data, companyName: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-bold text-xs"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-xs">عنوان فرعی سربرگ:</label>
              <input
                type="text"
                value={data.companySubEng}
                onChange={(e) => setData({ ...data, companySubEng: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold block mb-1">نام رئیس شرکت:</label>
              <input
                type="text"
                value={data.president.name}
                onChange={(e) => setData({ ...data, president: { ...data.president, name: e.target.value } })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">سمت رئیس:</label>
              <input
                type="text"
                value={data.president.title}
                onChange={(e) => setData({ ...data, president: { ...data.president, title: e.target.value } })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">شماره تماس رئیس:</label>
              <input
                type="text"
                value={data.president.phone || ''}
                onChange={(e) => setData({ ...data, president: { ...data.president, phone: e.target.value } })}
                className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-mono"
                placeholder="۰۷۹۹xxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-blue-200">
            <label className="font-bold block text-slate-800 dark:text-slate-200">اعضای هیئت نظار:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.boardMembers.map((bm, idx) => (
                <div key={bm.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border space-y-1.5">
                  <input
                    type="text"
                    value={bm.name}
                    placeholder="نام"
                    onChange={(e) => {
                      const updated = [...data.boardMembers];
                      updated[idx].name = e.target.value;
                      setData({ ...data, boardMembers: updated });
                    }}
                    className="w-full p-1.5 border rounded font-bold text-xs"
                  />
                  <input
                    type="text"
                    value={bm.title}
                    placeholder="سمت"
                    onChange={(e) => {
                      const updated = [...data.boardMembers];
                      updated[idx].title = e.target.value;
                      setData({ ...data, boardMembers: updated });
                    }}
                    className="w-full p-1 border rounded text-xs text-slate-600"
                  />
                  <input
                    type="text"
                    value={bm.phone || ''}
                    placeholder="شماره تماس"
                    onChange={(e) => {
                      const updated = [...data.boardMembers];
                      updated[idx].phone = e.target.value;
                      setData({ ...data, boardMembers: updated });
                    }}
                    className="w-full p-1 border rounded text-xs font-mono text-slate-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-blue-200">
            <label className="font-bold block text-slate-800 dark:text-slate-200">کادر اجرایی اصلی:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.executives.map((exec, idx) => (
                <div key={exec.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border space-y-1.5">
                  <input
                    type="text"
                    value={exec.name}
                    placeholder="نام"
                    onChange={(e) => {
                      const updated = [...data.executives];
                      updated[idx].name = e.target.value;
                      setData({ ...data, executives: updated });
                    }}
                    className="w-full p-1.5 border rounded font-bold text-xs"
                  />
                  <input
                    type="text"
                    value={exec.title}
                    placeholder="سمت"
                    onChange={(e) => {
                      const updated = [...data.executives];
                      updated[idx].title = e.target.value;
                      setData({ ...data, executives: updated });
                    }}
                    className="w-full p-1 border rounded text-xs text-slate-600"
                  />
                  <input
                    type="text"
                    value={exec.phone || ''}
                    placeholder="شماره تماس"
                    onChange={(e) => {
                      const updated = [...data.executives];
                      updated[idx].phone = e.target.value;
                      setData({ ...data, executives: updated });
                    }}
                    className="w-full p-1 border rounded text-xs font-mono text-slate-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-blue-200">
            <label className="font-bold block text-slate-800 dark:text-slate-200">نمایندگی‌ها:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(data.branches || []).map((br, idx) => (
                <div key={br.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border space-y-1.5 shadow-2xs">
                  <input
                    type="text"
                    value={br.name}
                    placeholder="نام نمایندگی"
                    onChange={(e) => {
                      const updated = [...(data.branches || [])];
                      updated[idx].name = e.target.value;
                      setData({ ...data, branches: updated });
                    }}
                    className="w-full p-1.5 border rounded font-bold text-xs text-blue-900 dark:text-blue-200 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={br.title}
                    placeholder="مسئول نمایندگی"
                    onChange={(e) => {
                      const updated = [...(data.branches || [])];
                      updated[idx].title = e.target.value;
                      setData({ ...data, branches: updated });
                    }}
                    className="w-full p-1 border rounded text-xs dark:bg-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    value={br.phone || ''}
                    placeholder="شماره تماس نمایندگی"
                    onChange={(e) => {
                      const updated = [...(data.branches || [])];
                      updated[idx].phone = e.target.value;
                      setData({ ...data, branches: updated });
                    }}
                    className="w-full p-1 border rounded text-xs font-mono dark:bg-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    value={br.staff ? br.staff.join(' ، ') : ''}
                    placeholder="سایر کارمندان (با ویرگول جدا کنید)"
                    onChange={(e) => {
                      const updated = [...(data.branches || [])];
                      const val = e.target.value;
                      updated[idx].staff = val ? val.split(/[,،·\n]/).map(s => s.trim()).filter(Boolean) : [];
                      setData({ ...data, branches: updated });
                    }}
                    className="w-full p-1 border rounded text-xs text-slate-700 dark:text-slate-300 dark:bg-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Org Chart Canvas matching exact uploaded image */}
      <div 
        id="org-chart-export-canvas"
        className="bg-slate-50 dark:bg-slate-950 p-2 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl print:shadow-none print:border-none print:p-0 print:bg-white text-slate-900 dark:text-slate-100 dir-rtl overflow-x-auto"
      >
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* DAB Standard Official Header */}
          <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <DabOfficialHeader
              storageKey={`dab_org_chart_header_${companyId}`}
              governmentTitle="امارت اسلامی افغانستان"
              bankName="د افغانستان بانک"
              department="آمریت عمومی نظارت از مؤسسات مالی غیر بانکی"
              directorate="مدیریت جوازدهی صرافی‌ها و خدمات پولی"
              formTitle={data.headerTitle}
              formNumber="DAB-NBFI-EXC-FORM-04"
              companyName={data.companyName}
              licenseNo="DAB/7-0965"
              isEditable={false}
            />
          </div>

          {/* Org Tree Content Container */}
          <div className="p-4 sm:p-8 space-y-10 overflow-x-auto min-w-full">
            
            {/* LEVEL 1: President Box (Centered Dark Blue Box) */}
            <div className="flex flex-col items-center relative">
              <div className="w-full max-w-[340px] sm:max-w-[380px]">
                {renderInteractiveNodeCard({
                  node: data.president,
                  variant: 'president',
                  isDark: true,
                  badgeText: '۱۰۰٪ سهمدار',
                  customClass: 'text-center',
                  hasSubBranches: true,
                  isSubBranchCollapsed: !!collapsedBranches['president'],
                  onToggleSubBranch: () => toggleBranchCollapse('president'),
                  subBranchCount: (data.boardMembers?.length || 0) + (data.executives?.length || 0) + (data.branches?.length || 0),
                  subBranchLabel: 'زیرمجموعه‌های رئیس',
                  reportsTo: 'مجمع عمومی سهمداران / د افغانستان بانک'
                })}
              </div>

              {/* Collapsed state placeholder for President's sub-tree */}
              {collapsedBranches['president'] ? (
                <div className="flex flex-col items-center py-6 animate-in fade-in">
                  <div className="w-0.5 h-8 bg-[#1e3a8a] dark:bg-blue-400"></div>
                  <button
                    type="button"
                    onClick={() => toggleBranchCollapse('president')}
                    className="group px-5 py-3 bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/80 text-amber-900 dark:text-amber-300 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-sm transition-all cursor-pointer print:hidden"
                  >
                    <Layers className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>تمام شاخه‌های زیرمجموعه بسته‌شده‌اند ({(data.boardMembers?.length || 0) + (data.executives?.length || 0) + (data.branches?.length || 0)} پست تشکیلاتی) — جهت باز کردن کلیک کنید</span>
                    <ChevronDown className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Automatic Connector to Level 2 */}
                  <TreeConnectors count={data.boardMembers?.length || 0} />

                  {/* LEVEL 2: Board of Supervisors (Dynamic count) */}
                  <div className="w-full space-y-4">
                    {/* Level 2 Section Bar */}
                    <div className="flex items-center justify-between px-2 print:hidden">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>سطح ۲: هیئت نظار ({(data.boardMembers || []).length} عضو)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleBranchCollapse('board')}
                        className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                      >
                        {collapsedBranches['board'] ? '▶️ نمایش کادر اجرایی' : '🔽 بستن شاخه‌های پایین‌تر'}
                      </button>
                    </div>

                    <div className="w-full overflow-x-auto pb-2">
                      <div 
                        className="grid gap-4 sm:gap-6 mx-auto items-start justify-center"
                        style={{ 
                          gridTemplateColumns: `repeat(${(data.boardMembers || []).length || 1}, minmax(260px, 320px))`,
                          maxWidth: `${Math.max((data.boardMembers || []).length * 320, 320)}px`
                        }}
                      >
                        {(data.boardMembers || []).map((bm) => (
                          <div key={bm.id}>
                            {renderInteractiveNodeCard({
                              node: bm,
                              variant: 'board',
                              isDark: bm.title.includes('رئیس'),
                              badgeText: bm.title.includes('رئیس') ? 'رئیس نظار' : 'هیئت نظار',
                              customClass: bm.title.includes('رئیس') ? 'transform sm:-translate-y-1' : '',
                              reportsTo: `مجمع عمومی / ${data.president.name}`
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* If Board sub-branches collapsed */}
                  {collapsedBranches['board'] ? (
                    <div className="flex flex-col items-center py-6 animate-in fade-in">
                      <div className="w-0.5 h-8 bg-[#1e3a8a] dark:bg-blue-400"></div>
                      <button
                        type="button"
                        onClick={() => toggleBranchCollapse('board')}
                        className="group px-5 py-2.5 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 border-2 border-dashed border-blue-400 text-[#1e3a8a] dark:text-blue-200 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer print:hidden"
                      >
                        <GitBranch className="w-4 h-4 text-blue-600" />
                        <span>شاخه‌های کادر اجرایی و نمایندگی‌ها بسته‌شده‌اند ({(data.executives?.length || 0) + (data.branches?.length || 0)} واحد) — جهت باز کردن کلیک کنید</span>
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Automatic Connector down to Executives */}
                      <TreeConnectors count={(data.executives || []).length} />

                      {/* LEVEL 3: Executive Managers (Dynamic count) */}
                      <div className="w-full space-y-4">
                        <div className="flex items-center justify-between px-2 print:hidden">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            سطح ۳: کادر اجرایی و مدیریت ارشد ({(data.executives || []).length} مسئول)
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleBranchCollapse('branches')}
                            className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                          >
                            {collapsedBranches['branches'] ? '▶️ نمایش نمایندگی‌های ولایتی' : '🔽 بستن نمایندگی‌های ولایتی'}
                          </button>
                        </div>

                        <div className="w-full overflow-x-auto pb-2">
                          <div 
                            className="grid gap-4 sm:gap-6 mx-auto items-start justify-center"
                            style={{ 
                              gridTemplateColumns: `repeat(${(data.executives || []).length || 1}, minmax(260px, 340px))`,
                              maxWidth: `${Math.max((data.executives || []).length * 340, 340)}px`
                            }}
                          >
                            {(data.executives || []).map((exec) => {
                              let execReportsTo = `مدیر اجرائیه / ${data.president.name}`;
                              if (exec.title.includes('پیروی') || exec.title.includes('Compliance')) {
                                execReportsTo = 'هیئت نظار و د افغانستان بانک';
                              } else if (exec.title.includes('اجرائیه') || exec.title.includes('عملیاتی')) {
                                execReportsTo = `رئیس هیئت مدیره (${data.president.name})`;
                              }
                              return (
                                <div key={exec.id}>
                                  {renderInteractiveNodeCard({
                                    node: exec,
                                    variant: 'executive',
                                    isDark: true,
                                    badgeText: exec.title.includes('پیروی') ? 'AML/CFT Compliance' : 'کادر اجرایی',
                                    hasSubBranches: exec.title.includes('عملیاتی') || exec.id === 'exec-2',
                                    isSubBranchCollapsed: !!collapsedBranches['branches'],
                                    onToggleSubBranch: () => toggleBranchCollapse('branches'),
                                    subBranchCount: (data.branches || []).length,
                                    subBranchLabel: 'نمایندگی‌های ولایتی',
                                    reportsTo: execReportsTo
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* LEVEL 4: Provincial Branches under Operational Manager */}
                      {(data.branches || []).length > 0 && (
                        <>
                          {collapsedBranches['branches'] ? (
                            <div className="flex flex-col items-center py-6 animate-in fade-in">
                              <div className="w-0.5 h-8 bg-[#1e3a8a] dark:bg-blue-400"></div>
                              <button
                                type="button"
                                onClick={() => toggleBranchCollapse('branches')}
                                className="group px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 border-2 border-dashed border-indigo-400 text-indigo-900 dark:text-indigo-200 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer print:hidden"
                              >
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                <span>شاخه نمایندگی‌های ولایتی فشرده شده است ({(data.branches || []).length} نمایندگی) — جهت باز کردن کلیک کنید</span>
                                <ChevronDown className="w-4 h-4 text-indigo-600" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-center my-4">
                                <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-950/80 text-[#1e3a8a] dark:text-blue-200 border border-blue-300 dark:border-blue-800 text-xs font-black px-4 py-1.5 rounded-full shadow-xs">
                                  <span>نماینده‌ها و نمایندگی‌های ولایتی</span>
                                  <span className="text-[10px] bg-[#1e3a8a] text-white px-2 py-0.5 rounded-full font-bold">تحت اثر کادر اجرایی</span>
                                </span>
                              </div>

                              {/* Clean automatic connector down to Provincial Branches */}
                              <TreeConnectors count={(data.branches || []).length} />

                              <div className="w-full overflow-x-auto pb-2">
                                <div 
                                  className="grid gap-4 sm:gap-6 items-start mx-auto justify-center"
                                  style={{
                                    gridTemplateColumns: `repeat(${(data.branches || []).length || 1}, minmax(250px, 300px))`,
                                    maxWidth: `${Math.max((data.branches || []).length * 300, 300)}px`
                                  }}
                                >
                                  {(data.branches || []).map((br) => {
                                    const isStaffCollapsed = !!collapsedBranches[`staff-${br.id}`];
                                    const execManagerName = data.executives.find(e => e.title.includes('عملیاتی') || e.title.includes('اجرائیه'))?.name || 'مدیر بخش عملیاتی';
                                    return (
                                      <div key={br.id} className="space-y-2">
                                        {renderInteractiveNodeCard({
                                          node: br,
                                          variant: 'branch',
                                          isDark: false,
                                          badgeText: 'نمایندگی رسمی',
                                          subtitleOverride: br.title,
                                          hasSubBranches: !!(br.staff && br.staff.length > 0),
                                          isSubBranchCollapsed: isStaffCollapsed,
                                          onToggleSubBranch: () => toggleBranchCollapse(`staff-${br.id}`),
                                          subBranchCount: br.staff?.length,
                                          subBranchLabel: 'کارکنان',
                                          reportsTo: `مدیریت عملیات و اجرائیه (${execManagerName})`
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* SECTION: Reporting Relationships & Separation of Duties Table */}
            <div className="pt-8 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
              
              {/* Section Title Header */}
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span className="text-lg sm:text-xl">📋</span>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  روابط گزارش‌دهی و اصل تفکیک وظایف
                </h3>
              </div>

              {/* Table Layout matching exact PDF/image table */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs sm:text-sm text-right">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700 font-black">
                      <th className="p-3 w-1/3 border-l border-slate-300 dark:border-slate-700">واحد</th>
                      <th className="p-3">گزارش‌دهی به</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                    {data.reportingRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-800/40'}
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800">
                          {row.unit}
                        </td>
                        <td className="p-3">
                          {row.reportsTo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Note */}
              <div className="pt-2 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span>{data.footerNote}</span>
              </div>
            </div>

            {/* Official DAB Approval Section */}
            <div className="pt-8 border-t-2 border-slate-300 dark:border-slate-700 space-y-4">
              <div className="text-center mb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-1 rounded-full border border-slate-300 dark:border-slate-700">
                  تأییدیه و ثبت رسمی شرکت صرافی / خدمات پولی در د افغانستان بانک
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs">
                {/* Column 1: Board / Shareholder Approval */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="font-black text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
                    تأیید رئیس هیئت مدیره / سهمدار اصلی
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-bold space-y-1">
                    <p>نام و تخلص: {data.president.name}</p>
                    <p className="text-[11px] text-slate-500">شماره تذکره / کارت: ثبت شده</p>
                  </div>
                </div>

                {/* Column 2: Executive Director Approval */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="font-black text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
                    تأیید مدیر اجرائیه / کادر فنی
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-bold space-y-1">
                    <p>نام مسئول: {data.executives[0]?.name || 'مدیر اجرائیه'}</p>
                    <p className="text-[11px] text-slate-500">پست: {data.executives[0]?.title || 'مدیر عملیاتی'}</p>
                  </div>
                </div>

                {/* Column 3: Registration Status */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 space-y-3 flex flex-col justify-center">
                  <div className="font-black text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
                    ثبت د افغانستان بانک
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold pt-1">
                    تاریخ ثبت: _____ / _____ / ۱۴۰۳
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

