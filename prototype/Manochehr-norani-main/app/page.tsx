
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, UserCheck, ShieldCheck, Printer, Search, Briefcase, 
  Award, Shield, Edit3, Plus, Trash2, RotateCcw, Sun, Moon, Contrast, Check, X, User, FileText, Network, Image as ImageIcon, Download, Eye, Activity, Users, Database, Filter, Layers, EyeOff, Menu, ChevronRight, ChevronLeft, Stamp, ClipboardList, ClipboardCheck, BookOpen, RefreshCw, GitBranch, Grid, Settings2, LogOut, Key, FileCode
} from 'lucide-react';
import DabGuaranteeForm from '@/components/DabGuaranteeForm';
import DabBranchRenewalForm from '@/components/DabBranchRenewalForm';
import DabLicenseRenewalForm from '@/components/DabLicenseRenewalForm';
import DabLicenseRenewalLetter from '@/components/DabLicenseRenewalLetter';
import MeetingMinutes from '@/components/MeetingMinutes';
import DabLicenseChecklist from '@/components/DabLicenseChecklist';
import DabLicenseRenewalChecklist from '@/components/DabLicenseRenewalChecklist';
import DabBranchRenewalChecklist from '@/components/DabBranchRenewalChecklist';
import EmployeeManagement from '@/components/EmployeeManagement';
import CompanyArticles from '@/components/CompanyArticles';
import CompanyProposal from '@/components/CompanyProposal';
import OrgChartCanvas from '@/components/OrgChartCanvas';
import CompanyLogoModal from '@/components/CompanyLogoModal';
import ExportPdfModal from '@/components/ExportPdfModal';
import PrintPreviewModal from '@/components/PrintPreviewModal';
import ComplianceReporting from '@/components/ComplianceReporting';
import BatchExportModal, { ALL_BATCH_DOCUMENTS } from '@/components/BatchExportModal';
import BatchExportStaging from '@/components/BatchExportStaging';
import { PackageCheck, FileStack } from 'lucide-react';
import { useCompany } from '@/lib/companyContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  subscribePersonnel, 
  subscribeSettings, 
  saveSinglePersonnelToSupabase, 
  deletePersonnelFromSupabase, 
  savePersonnelToSupabase, 
  saveSettingsToSupabase, 
  testSupabaseDataConnection,
  PersonnelNode as FirebasePersonnelNode,
  subscribeEmployees,
  DEFAULT_EMPLOYEES,
  seedEmployees
} from '@/lib/supabaseData';

interface PersonnelNode {
  key: string;
  title: string;
  name: string;
  id: string;
  category: 'president' | 'board' | 'operations' | 'compliance' | 'branch' | 'executive';
  description?: string;
}

const DEFAULT_ORG_DATA: PersonnelNode[] = [
  {
    key: 'president',
    title: 'رئیس شرکت',
    name: 'برکت‌الله ولد عبدالغفور',
    id: '55522',
    category: 'executive'
  },
  {
    key: 'supervisory_chairman',
    title: 'رئیس هیئت نظار',
    name: 'بسم‌الله شیرزی ولد دوستمحمد',
    id: '45188',
    category: 'board'
  },
  {
    key: 'board_member_1',
    title: 'عضو هیئت نظار',
    name: 'برکت‌الله غفوری ولد عبدالغفور',
    id: '55522',
    category: 'board'
  },
  {
    key: 'board_member_2',
    title: 'عضو هیئت نظار',
    name: 'عظیم‌الله رحمانی ولد محمد آجان',
    id: '35806',
    category: 'board'
  },
  {
    key: 'operations_manager',
    title: 'مدیر بخش عملیاتی',
    name: 'صالح‌محمد ولد عبدالرحیم',
    id: '48424',
    category: 'executive'
  },
  {
    key: 'compliance_officer',
    title: 'مسئول پیروی از قوانین',
    name: 'عبدالعزیز مهرزاد ولد عبدالخلیل',
    id: '72198-0300-1401',
    category: 'executive'
  },
  {
    key: 'branch_takhar',
    title: 'نماینده ولایت تخار',
    name: 'رحمت‌الله ولد فیض‌الله',
    id: '29384',
    category: 'branch'
  },
  {
    key: 'branch_takhar_treasurer',
    title: 'خزانه‌دار نمایندگی تخار',
    name: 'عبیدالله ولد نصرالله',
    id: '48392',
    category: 'branch'
  },
  {
    key: 'branch_kabul',
    title: 'نماینده کابل',
    name: 'اجمل ولد نورآغا',
    id: '46338',
    category: 'branch'
  },
  {
    key: 'branch_kabul_member',
    title: 'عضو نمایندگی کابل',
    name: 'ریحان ولد شیرآغا',
    id: '12345',
    category: 'branch'
  },
  {
    key: 'branch_kabul_sec',
    title: 'منشی و خزانه‌دار کابل',
    name: 'صدیق‌الله ولد حبیب‌الله',
    id: '67890',
    category: 'branch'
  },
  {
    key: 'branch_imam_sahib',
    title: 'نماینده ولسوالی امام‌صاحب',
    name: 'محمدیوسف ولد عبدالمجید',
    id: '98680',
    category: 'branch'
  },
  {
    key: 'branch_imam_sahib_treasurer',
    title: 'خزانه‌دار امام‌صاحب',
    name: 'عبدالمجید ولد محمدیوسف',
    id: '54321',
    category: 'branch'
  },
  {
    key: 'branch_kishm',
    title: 'نماینده کشم، ولایت بدخشان',
    name: 'عتیق‌الله ولد شمس‌الدین',
    id: '7252',
    category: 'branch'
  }
];

export default function OrgChartPage() {
  const { user, logout, changePassword } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'org-chart' | 'compliance-reporting' | 'guarantee-form' | 'branch-renewal' | 'license-renewal' | 'license-renewal-letter' | 'meeting-minutes' | 'license-checklist' | 'license-renewal-checklist' | 'branch-renewal-checklist' | 'employees' | 'company-articles' | 'company-proposal'>('org-chart');
  const [personnel, setPersonnel] = useState<PersonnelNode[]>(DEFAULT_ORG_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>('light');
  const [isEditMode, setIsEditMode] = useState(false);
  const [snapGridEnabled, setSnapGridEnabled] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [gridDensity, setGridDensity] = useState<'small' | 'medium' | 'large'>('medium');
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<PersonnelNode | null>(null);

  // Dragging, Magnetic Grid Snapping & Bounding Constraints state for #org-chart-export-canvas
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const [snappedIndicator, setSnappedIndicator] = useState<{ key: string; x: number; y: number } | null>(null);

  const getGridStep = (density: 'small' | 'medium' | 'large') => {
    if (density === 'small') return 12;
    if (density === 'large') return 48;
    return 24; // medium
  };

  const snapValue = (val: number, step: number) => {
    return Math.round(val / step) * step;
  };

  const handleNodePointerDown = (e: React.PointerEvent, nodeKey: string) => {
    if (!isEditMode) return;
    if ((e.target as HTMLElement).closest('button, input, a, svg')) return;

    const canvasEl = document.getElementById('org-chart-export-canvas');
    const nodeEl = e.currentTarget as HTMLElement;
    if (!canvasEl || !nodeEl) return;

    e.stopPropagation();

    try {
      nodeEl.setPointerCapture(e.pointerId);
    } catch (_) {}

    const currentPos = nodePositions[nodeKey] || { x: 0, y: 0 };
    setDraggingNodeKey(nodeKey);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
    });
  };

  const handleNodePointerMove = (e: React.PointerEvent, nodeKey: string) => {
    if (!isEditMode || draggingNodeKey !== nodeKey || !dragStart) return;

    const canvasEl = document.getElementById('org-chart-export-canvas');
    const nodeEl = e.currentTarget as HTMLElement;
    if (!canvasEl || !nodeEl) return;

    const deltaX = e.clientX - dragStart.mouseX;
    const deltaY = e.clientY - dragStart.mouseY;

    const rawX = dragStart.initialX + deltaX;
    const rawY = dragStart.initialY + deltaY;

    // Bounding constraints relative to #org-chart-export-canvas
    const nodeRect = nodeEl.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const currentX = nodePositions[nodeKey]?.x || 0;
    const currentY = nodePositions[nodeKey]?.y || 0;

    const origLeft = nodeRect.left - canvasRect.left - currentX;
    const origTop = nodeRect.top - canvasRect.top - currentY;

    const padding = 16;
    const minX = -origLeft + padding;
    const maxX = canvasRect.width - origLeft - nodeRect.width - padding;
    const minY = -origTop + padding;
    const maxY = canvasRect.height - origTop - nodeRect.height - padding;

    // Apply strict bounding box constraints to keep nodes inside visible canvas area
    const boundedX = Math.max(minX, Math.min(maxX, rawX));
    const boundedY = Math.max(minY, Math.min(maxY, rawY));

    // Apply magnetic snap to nearest grid intersection
    const step = getGridStep(gridDensity);
    const finalX = snapGridEnabled ? snapValue(boundedX, step) : boundedX;
    const finalY = snapGridEnabled ? snapValue(boundedY, step) : boundedY;

    setNodePositions((prev) => ({
      ...prev,
      [nodeKey]: { x: finalX, y: finalY },
    }));

    if (snapGridEnabled) {
      setSnappedIndicator({ key: nodeKey, x: finalX, y: finalY });
    }
  };

  const handleNodePointerUp = (e: React.PointerEvent, nodeKey: string) => {
    if (draggingNodeKey === nodeKey) {
      try {
        const nodeEl = e.currentTarget as HTMLElement;
        if (nodeEl.hasPointerCapture(e.pointerId)) {
          nodeEl.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      setDraggingNodeKey(null);
      setDragStart(null);
      setSnappedIndicator(null);

      try {
        localStorage.setItem(`bg_node_positions_${activeCompanyId}`, JSON.stringify(nodePositions));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleResetNodePositions = () => {
    setNodePositions({});
    try {
      localStorage.removeItem(`bg_node_positions_${activeCompanyId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const getNodeDragProps = (nodeKey: string) => {
    const currentPos = nodePositions[nodeKey];
    const isDragging = draggingNodeKey === nodeKey;

    return {
      onPointerDown: (e: React.PointerEvent) => handleNodePointerDown(e, nodeKey),
      onPointerMove: (e: React.PointerEvent) => handleNodePointerMove(e, nodeKey),
      onPointerUp: (e: React.PointerEvent) => handleNodePointerUp(e, nodeKey),
      style: {
        transform: currentPos ? `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)` : undefined,
        touchAction: isEditMode ? ('none' as const) : ('auto' as const),
        transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
        zIndex: isDragging ? 40 : undefined,
      },
      classNameAddons: isEditMode
        ? `select-none cursor-grab active:cursor-grabbing ${isDragging ? 'ring-2 ring-amber-500 shadow-2xl scale-102 z-40' : ''}`
        : '',
    };
  };

  // Logo and Header Dates state
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState('۱۴۰۴/۰۱/۰۱');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const { companies, activeCompanyId, setActiveCompanyId, addCompany } = useCompany();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [exportInitialFormat, setExportInitialFormat] = useState<'pdf' | 'word'>('pdf');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([
    'license-renewal-letter',
    'meeting-minutes',
    'org-chart',
    'license-renewal',
    'branch-renewal',
    'guarantee-form',
    'license-renewal-checklist',
  ]);
  const [batchDocsMeta, setBatchDocsMeta] = useState<{ id: string; title: string; category: string }[]>([]);

  const handleOpenExport = (format: 'pdf' | 'word' = 'pdf') => {
    setExportInitialFormat(format);
    setIsPdfModalOpen(true);
    setIsMobileSidebarOpen(false);
  };

  // Dynamic Real-time Dashboard Stats Calculations
  const totalPersonnelCount = personnel.length;
  const boardMembersCount = personnel.filter((p) => p.category === 'board').length;
  const activeBranchesCount = personnel.filter((p) => p.category === 'branch').length;
  const executiveCount = personnel.filter((p) => p.category === 'president' || p.category === 'operations' || p.category === 'compliance').length;

  // Connection & Sync state
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Load persisted state and connect to Firebase Firestore for the active company
  useEffect(() => {
    // Verify connection to Firestore
    testSupabaseDataConnection().then(() => {
      setIsDbConnected(true);
    });

    // Reset or load company-specific local state
    try {
      const savedPersonnel = localStorage.getItem(`bg_org_chart_data_${activeCompanyId}`);
      if (savedPersonnel) {
        setPersonnel(JSON.parse(savedPersonnel));
      } else {
        setPersonnel(DEFAULT_ORG_DATA);
      }
      const savedIssueDate = localStorage.getItem(`org_chart_issue_date_${activeCompanyId}`);
      if (savedIssueDate) {
        setIssueDate(savedIssueDate);
      } else {
        setIssueDate('۱۴۰۴/۰۱/۰۱');
      }
      const savedLogo = localStorage.getItem(`custom_company_logo_${activeCompanyId}`);
      setCustomLogo(savedLogo || null);
      const savedPositions = localStorage.getItem(`bg_node_positions_${activeCompanyId}`);
      if (savedPositions) {
        setNodePositions(JSON.parse(savedPositions));
      } else {
        setNodePositions({});
      }
    } catch (e) {
      console.error('Failed to load local storage state for company', e);
    }

    // Subscribe to Supabase Personnel collection for activeCompanyId
    const unsubscribePersonnel = subscribePersonnel((list) => {
      if (list && list.length > 0) {
        setPersonnel(list);
        localStorage.setItem(`bg_org_chart_data_${activeCompanyId}`, JSON.stringify(list));
      } else {
        // Seed default personnel data to Firestore if database collection is empty for this company
        savePersonnelToSupabase(DEFAULT_ORG_DATA, activeCompanyId);
      }
    }, activeCompanyId);

    // Subscribe to Supabase Settings for activeCompanyId
    const unsubscribeSettings = subscribeSettings((settings) => {
      if (settings.issueDate) {
        setIssueDate(settings.issueDate);
        localStorage.setItem(`org_chart_issue_date_${activeCompanyId}`, settings.issueDate);
      }
      if (settings.customLogo !== undefined) {
        setCustomLogo(settings.customLogo);
        if (settings.customLogo) {
          localStorage.setItem(`custom_company_logo_${activeCompanyId}`, settings.customLogo);
        } else {
          localStorage.removeItem(`custom_company_logo_${activeCompanyId}`);
        }
      }
    }, activeCompanyId);

    // Subscribe to employees and seed missing ones if necessary for activeCompanyId
    let isSeeding = false;
    const unsubscribeEmployees = subscribeEmployees(async (list) => {
      if (isSeeding) return;
      
      const existingIds = new Set(list.map(e => e.id));
      const missingAny = DEFAULT_EMPLOYEES.some(de => !existingIds.has(de.id));
      
      if (missingAny && list.length === 0) {
        isSeeding = true;
        console.log('Seeding missing employees for company...', activeCompanyId);
        await seedEmployees(DEFAULT_EMPLOYEES, activeCompanyId);
        isSeeding = false;
      }
    }, activeCompanyId);

    const handleLogoUpdate = () => {
      const updatedLogo = localStorage.getItem(`custom_company_logo_${activeCompanyId}`);
      const currentIssueDate = localStorage.getItem(`org_chart_issue_date_${activeCompanyId}`) || '۱۴۰۴/۰۱/۰۱';
      setCustomLogo(updatedLogo);
      saveSettingsToSupabase({ issueDate: currentIssueDate, customLogo: updatedLogo }, activeCompanyId);
    };
    window.addEventListener('custom_logo_updated', handleLogoUpdate);

    return () => {
      unsubscribePersonnel();
      unsubscribeSettings();
      unsubscribeEmployees();
      window.removeEventListener('custom_logo_updated', handleLogoUpdate);
    };
  }, [activeCompanyId]);

  const handleSaveLogo = async (logoDataUrl: string | null) => {
    try {
      if (!logoDataUrl) {
        setCustomLogo(null);
        localStorage.removeItem(`custom_company_logo_${activeCompanyId}`);
        localStorage.removeItem(`custom_company_logo_path_${activeCompanyId}`);
        window.dispatchEvent(new Event('custom_logo_updated'));
        return;
      }

      const response = await fetch(logoDataUrl);
      const blob = await response.blob();
      const extension = blob.type === 'image/svg+xml' ? 'svg' : 'png';
      const path = `${activeCompanyId}/logo.${extension}`;

      const { error: uploadError } = await supabase.storage.from('company-logos').upload(path, blob, {
        upsert: true,
        contentType: blob.type || 'image/png',
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
      setCustomLogo(data.publicUrl);
      localStorage.setItem(`custom_company_logo_${activeCompanyId}`, data.publicUrl);
      localStorage.setItem(`custom_company_logo_path_${activeCompanyId}`, path);
      window.dispatchEvent(new Event('custom_logo_updated'));
    } catch (error) {
      console.error('Company logo upload failed:', error);
      alert('آپلود لوگو انجام نشد. اتصال Supabase و دسترسی حساب را بررسی کنید.');
    }
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    localStorage.setItem(`org_chart_issue_date_${activeCompanyId}`, newDate);
    saveSettingsToSupabase({ issueDate: newDate, customLogo }, activeCompanyId);
  };

  const getPdfExportConfig = () => {
    switch (activeTab) {
      case 'guarantee-form':
        return {
          targetId: 'dab-official-form',
          title: 'فورم تعهدنامه و تضمین سر سهمدار (د افغانستان بانک)',
          filename: 'فورم_تضمین_سر_سهمدار_DAB.pdf',
        };
      case 'branch-renewal':
        return {
          targetId: 'dab-branch-renewal-canvas',
          title: 'فورم درخواست تمدید نمایندگی (د افغانستان بانک)',
          filename: 'فورم_تمدید_نمایندگی_DAB.pdf',
        };
      case 'license-renewal':
        return {
          targetId: 'dab-license-renewal-canvas',
          title: 'فورم ارزیابی و تمدید جواز شرکت صرافی (د افغانستان بانک)',
          filename: 'فورم_تمدید_جواز_شرکت_DAB.pdf',
        };
      case 'license-renewal-letter':
        return {
          targetId: 'dab-license-renewal-letter-canvas',
          title: 'مکتوب رسمی درخواست تمدید جواز فعالیت (د افغانستان بانک)',
          filename: 'مکتوب_تمدید_جواز_DAB.pdf',
        };
      case 'company-proposal':
        return {
          targetId: 'company-proposal-canvas',
          title: 'پیشنهاد و احکام تعیین هیئت نظار شرکت',
          filename: 'پیشنهاد_هیئت_نظار_DAB.pdf',
        };
      case 'meeting-minutes':
        return {
          targetId: 'meeting-minutes-canvas',
          title: 'صورتجلسه مجمع عمومی عادی سالانه شرکت',
          filename: 'صورتجلسه_مجمع_عمومی_شرکت.pdf',
        };
      case 'license-checklist':
        return {
          targetId: 'license-checklist-canvas',
          title: 'چک‌لست اسناد و شرایط صدور جواز فعالیت',
          filename: 'چک_لست_اسناد_جواز.pdf',
        };
      case 'license-renewal-checklist':
        return {
          targetId: 'dab-license-renewal-checklist-canvas',
          title: 'چک‌لست اسناد و شرایط تمدید جواز فعالیت',
          filename: 'چک_لست_تمدید_جواز.pdf',
        };
      case 'branch-renewal-checklist':
        return {
          targetId: 'dab-branch-renewal-checklist-canvas',
          title: 'چک‌لست اسناد تمدید نمایندگی شرکت',
          filename: 'چک_لست_تمدید_نمایندگی.pdf',
        };
      case 'employees':
        return {
          targetId: 'employee-management-cv-canvas',
          title: 'خلص سوانح و مدیریت معلومات پرسونل',
          filename: 'خلص_سوانح_پرسونل.pdf',
        };
      case 'company-articles':
        return {
          targetId: 'company-articles-canvas',
          title: 'اساسنامه رسمی شرکت صرافی و خدمات پولی',
          filename: 'اساسنامه_شرکت_صرافی.pdf',
        };
      default:
        return {
          targetId: 'org-chart-exact-canvas',
          title: 'چارت تشکیلاتی و ساختار سازمانی شرکت صرافی',
          filename: 'چارت_سازمانی_شرکت_صرافی.pdf',
        };
    }
  };

  // Save to local storage and sync to Firestore
  const savePersonnel = (newData: PersonnelNode[]) => {
    setPersonnel(newData);
    try {
      localStorage.setItem(`bg_org_chart_data_${activeCompanyId}`, JSON.stringify(newData));
    } catch (e) {
      console.error('Failed to save org chart to storage', e);
    }
    savePersonnelToSupabase(newData, activeCompanyId);
  };

  const handleReset = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام اطلاعات چارت را به حالت اولیه بازگردانید؟')) {
      savePersonnel(DEFAULT_ORG_DATA);
    }
  };

  const handleUpdateNode = (updated: PersonnelNode) => {
    const nextData = personnel.map(p => p.key === updated.key ? updated : p);
    savePersonnel(nextData);
    saveSinglePersonnelToSupabase(updated, activeCompanyId);
    setEditingNode(null);
  };

  const handleAddRepresentative = () => {
    const newKey = `branch_${Date.now()}`;
    const newNode: PersonnelNode = {
      key: newKey,
      title: 'نمایندگی جدید',
      name: 'نام و ولد جدید',
      id: '00000',
      category: 'branch'
    };
    savePersonnel([...personnel, newNode]);
    saveSinglePersonnelToSupabase(newNode, activeCompanyId);
    setEditingNode(newNode);
  };

  const handleDeleteNode = (key: string) => {
    if (confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
      const nextData = personnel.filter(p => p.key !== key);
      savePersonnel(nextData);
      deletePersonnelFromSupabase(key, activeCompanyId);
      if (editingNode?.key === key) setEditingNode(null);
    }
  };

  const getNode = (key: string) => {
    let node = personnel.find(p => p.key === key);
    if (!node) {
      if (key === 'president') {
        node = personnel.find(p => p.key === 'chairman' || p.title.includes('رئیس شرکت'));
      } else if (key === 'operations_manager') {
        node = personnel.find(p => p.key === 'operations_head' || p.title.includes('عملیاتی'));
      } else if (key === 'compliance_officer') {
        node = personnel.find(p => p.key === 'compliance' || p.title.includes('قوانین') || p.title.includes('رعایت قوانین'));
      }
    }
    return node;
  };
  const getNodesByCategory = (category: 'board' | 'branch') => personnel.filter(p => p.category === category);

  const matchesSearch = (node?: PersonnelNode) => {
    if (!node || !searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      node.name.toLowerCase().includes(term) ||
      node.title.toLowerCase().includes(term) ||
      node.id.includes(term)
    );
  };

  // Theme styling helpers
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: 'bg-slate-950 text-slate-100',
          cardBg: 'bg-slate-900 border-slate-800 text-slate-100',
          headerBg: 'bg-slate-900 border-slate-800',
          nodeCardBg: 'bg-slate-900 border-slate-700 text-slate-100',
          highlight: 'border-blue-500 ring-2 ring-blue-500/30',
          connector: 'bg-slate-700',
          subText: 'text-slate-400',
        };
      case 'contrast':
        return {
          bg: 'bg-white text-black',
          cardBg: 'bg-white border-2 border-black text-black',
          headerBg: 'bg-white border-2 border-black',
          nodeCardBg: 'bg-white border-2 border-black text-black',
          highlight: 'border-black ring-4 ring-black/20',
          connector: 'bg-black',
          subText: 'text-black font-semibold',
        };
      case 'light':
      default:
        return {
          bg: 'bg-slate-50 text-slate-900',
          cardBg: 'bg-white border-slate-200 text-slate-900',
          headerBg: 'bg-white border-slate-200',
          nodeCardBg: 'bg-white border-slate-200 text-slate-900',
          highlight: 'border-blue-500 ring-2 ring-blue-500/20',
          connector: 'bg-slate-300',
          subText: 'text-slate-500',
        };
    }
  };

  const themeStyle = getThemeClasses();
  const president = getNode('president');
  const boardMembers = getNodesByCategory('board');
  const operations = getNode('operations_manager');
  const compliance = getNode('compliance_officer');
  const branches = getNodesByCategory('branch');
  const filteredBranches = selectedBranchFilter === 'all' 
    ? branches 
    : branches.filter(b => b.key === selectedBranchFilter);
  const selectedBranchObj = branches.find(b => b.key === selectedBranchFilter);

  return (
    <div className={`min-h-screen ${themeStyle.bg} font-sans flex flex-col lg:flex-row items-start transition-colors duration-200 print:bg-white print:text-black print:block dir-rtl overflow-x-hidden`}>
      
      {/* Mobile Top Header Bar (hidden on desktop & print) */}
      <div className="lg:hidden bg-blue-950 text-white p-3.5 border-b border-blue-900 flex items-center justify-between print:hidden sticky top-0 z-40 shadow-md w-full">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 bg-blue-900 hover:bg-blue-800 rounded-xl transition-all cursor-pointer border border-blue-700"
            title="باز کردن سایدبار منو"
          >
            <Menu className="w-5 h-5 text-amber-400" />
          </button>
          <span className="font-extrabold text-xs sm:text-sm truncate max-w-[240px]">
            {companies.find(c => c.id === activeCompanyId)?.name || 'شرکت صرافی'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenExport('word')}
            className="p-2 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            title="استخراج به ورد (Word)"
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">Word</span>
          </button>
          <button
            onClick={() => handleOpenExport('pdf')}
            className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            title="خروجی PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-all cursor-pointer"
            title="چاپ"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden print:hidden"
        />
      )}

      {/* Sidebar Component (RTL right-side sidebar) */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-72 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none flex flex-col justify-between z-50 transition-transform duration-300 print:hidden overflow-y-auto ${
          isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 space-y-8">
          {/* Sidebar Header / Branding */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {customLogo ? (
                  <div
                    onClick={() => setIsLogoModalOpen(true)}
                    className="relative group cursor-pointer shrink-0 transition-transform hover:scale-105"
                    title="مدیریت لوگو اختصاصی"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customLogo}
                      alt="Logo"
                      className="w-12 h-12 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 font-bold shadow-lg shadow-blue-500/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex flex-col group/company">
                  <div className="flex items-center gap-1">
                    <select 
                      value={activeCompanyId}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          const name = prompt('نام شرکت جدید را وارد کنید:');
                          if (name) {
                            const newId = 'company_' + Date.now();
                            addCompany({ id: newId, name, licenseNo: '' });
                            setActiveCompanyId(newId);
                          }
                        } else {
                          setActiveCompanyId(e.target.value);
                        }
                      }}
                      className="bg-transparent font-black text-sm text-slate-900 dark:text-white leading-tight truncate focus:outline-none appearance-none cursor-pointer max-w-[150px]"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
                      ))}
                      <option value="ADD_NEW" className="text-blue-600 font-bold">+ افزودن شرکت جدید</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">خدمات صرافی و پولی</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button type="button" onClick={() => setIsLogoModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
              <ImageIcon className="w-4 h-4" />
              {customLogo ? 'تغییر یا حذف لوگوی شرکت' : 'آپلود لوگوی شرکت'}
            </button>

            {/* DB Connection Status Badge */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-3 py-2 rounded-xl text-[11px] font-semibold">
              <span className="text-slate-500 dark:text-slate-400">وضعیت اتصال:</span>
              <div className={`flex items-center gap-1.5 font-bold ${isDbConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></span>
                <span>{isDbConnected ? 'متصل (Live)' : 'در حال اتصال...'}</span>
              </div>
            </div>

            {/* Dedicated Search Bar at Top of Sidebar */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute right-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (activeTab !== 'org-chart' && e.target.value.trim()) {
                      setActiveTab('org-chart');
                    }
                  }}
                  placeholder="جستجوی پرسنل و چارت..."
                  className="w-full pl-8 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              {searchTerm && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  در حال برجسته‌سازی نودهای منطبق در چارت
                </p>
              )}
            </div>
          </div>

          {/* Section 1: Main Pages & DAB Forms */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 px-1">
              منوی عملیاتی و فرم‌ها
            </div>
            <nav className="space-y-1">
              {[
                { id: 'compliance-reporting', icon: ShieldCheck, label: 'سامانه رعایت قوانین و گزارش‌دهی DAB', color: 'text-emerald-500' },
                { id: 'org-chart', icon: Network, label: 'چارت تشکیلاتی و ساختار سازمانی', color: 'text-blue-500' },
                { id: 'meeting-minutes', icon: ClipboardList, label: 'صورت‌جلسه مجمع عمومی', color: 'text-orange-500' },
                { id: 'license-renewal-letter', icon: Stamp, label: 'مکتوب رسمی تمدید جواز (DAB)', color: 'text-indigo-500' },
                { id: 'license-renewal', icon: ShieldCheck, label: 'فورم تمدید جواز مرکز (فورم ۱)', color: 'text-purple-500' },
                { id: 'branch-renewal', icon: Building2, label: 'فورم تمدید نمایندگی‌ها (فورم ۲)', color: 'text-emerald-500' },
                { id: 'company-proposal', icon: FileText, label: 'پیشنهاد معرفی هیئت نظار', color: 'text-rose-500' },
                { id: 'company-articles', icon: BookOpen, label: 'اساسنامه معیاری شرکت', color: 'text-amber-600' },
                { id: 'license-renewal-checklist', icon: RefreshCw, label: 'چک‌لیست تمدید جواز مرکز', color: 'text-emerald-600' },
                { id: 'branch-renewal-checklist', icon: GitBranch, label: 'چک‌لیست تمدید نمایندگی‌ها', color: 'text-teal-600' },
                { id: 'license-checklist', icon: ClipboardCheck, label: 'چک‌لیست صدور جواز اولیه', color: 'text-pink-500' },
                { id: 'guarantee-form', icon: FileText, label: 'تعهدنامه و تضمین‌خط سهمدار', color: 'text-amber-500' },
                { id: 'employees', icon: Users, label: 'خلص سوانح و مدیریت کارمندان', color: 'text-teal-500' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); setIsMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 group ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 transition-colors ${activeTab === item.id ? 'text-white' : item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  {activeTab === item.id && <ChevronLeft className="w-4 h-4 text-blue-200" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Edit Mode Toggle */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                isEditMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {isEditMode ? 'خروج از حالت ویرایش' : 'فعالسازی ویرایش'}
            </button>
          </div>
        </div>

        <div className="p-6 pt-0 space-y-4">
          {/* Featured Batch Export Button */}
          <button
            onClick={() => {
              setIsBatchExportModalOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white rounded-2xl border border-blue-700/60 shadow-lg shadow-blue-950/20 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-800 text-amber-400 rounded-xl group-hover:scale-105 transition-transform shadow-xs">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-xs font-black">خروجی دسته‌جمعی (Batch PDF)</div>
                <div className="text-[10px] text-blue-200/80">ادغام اسناد در یک فایل یکپارچه</div>
              </div>
            </div>
            <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
              پکیج DAB
            </span>
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => { setIsPrintPreviewOpen(true); setIsMobileSidebarOpen(false); }}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group cursor-pointer"
            >
              <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-bold">پیش‌نمایش</span>
            </button>
            <button
              onClick={() => handleOpenExport('word')}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800 transition-all group cursor-pointer"
            >
              <FileCode className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-bold">خروجی Word</span>
            </button>
            <button
              onClick={() => handleOpenExport('pdf')}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-800 transition-all group cursor-pointer"
            >
              <Download className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-bold">خروجی PDF</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'light', icon: Sun, label: 'روشن' },
              { id: 'dark', icon: Moon, label: 'تاریک' },
              { id: 'contrast', icon: Contrast, label: 'چاپ' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  theme === t.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* User Profile Actions */}
          {user && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 pb-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                  {user.email}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>تغییر رمز</span>
                </button>
                <button
                  onClick={async () => {
                    if (confirm('آیا مطمئن هستید که می‌خواهید خارج شوید؟')) {
                      await logout();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="pt-2 text-center">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">سامانه جامع مدیریت اسناد و تشکیلات صرافی</p>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-tight">V 2.5.0 • 7-0965</p>
          </div>
        </div>
      </aside>

      {/* Main Content View Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-auto">
        {/* Conditional Content Rendering */}
        {activeTab === 'compliance-reporting' ? (
          <ComplianceReporting 
            customLogo={customLogo} 
            companyId={activeCompanyId}
            isEditMode={isEditMode}
          />
        ) : activeTab === 'guarantee-form' ? (
          <DabGuaranteeForm 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            onExportWord={() => handleOpenExport('word')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'branch-renewal' ? (
          <DabBranchRenewalForm 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            onExportWord={() => handleOpenExport('word')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'license-renewal' ? (
          <DabLicenseRenewalForm 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            onExportWord={() => handleOpenExport('word')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'license-renewal-letter' ? (
          <DabLicenseRenewalLetter 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'company-proposal' ? (
          <CompanyProposal customLogo={customLogo} companyId={activeCompanyId}/>
        ) : activeTab === 'meeting-minutes' ? (
          <MeetingMinutes 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'license-checklist' ? (
          <DabLicenseChecklist 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'license-renewal-checklist' ? (
          <DabLicenseRenewalChecklist 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'branch-renewal-checklist' ? (
          <DabBranchRenewalChecklist 
            isEditMode={isEditMode} 
            customLogo={customLogo} 
            onOpenLogoModal={() => setIsLogoModalOpen(true)} 
            onExportPdf={() => handleOpenExport('pdf')} 
            companyId={activeCompanyId}
          />
        ) : activeTab === 'employees' ? (
          <EmployeeManagement customLogo={customLogo} isEditMode={isEditMode} companyId={activeCompanyId}/>
        ) : activeTab === 'company-articles' ? (
          <CompanyArticles customLogo={customLogo} companyId={activeCompanyId}/>
        ) : (
          <OrgChartCanvas 
            customLogo={customLogo} 
            companyId={activeCompanyId}
            isEditMode={isEditMode}
            searchTerm={searchTerm}
          />
        )}
        {false && (
        <>
          {/* Real-time Live Dashboard Stats Widget */}
          <div className="max-w-7xl mx-auto mb-8 px-4 print:hidden dir-rtl">
            <div className={`p-6 rounded-3xl border transition-all duration-300 shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200/60 text-slate-900'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b pb-4 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                      داشبورد مدیریت و آمار ساختاری
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      تجزیه و تحلیل زنده منابع انسانی و شبکه‌ی شعب شرکت برکت‌الله غفوری
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 transition-colors">
                  <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className={`text-[11px] font-bold ${isDbConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                    {isDbConnected ? 'اتصال هوشمند فعال' : 'در حال هماهنگی...'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'کل پرسنل فعال', count: totalPersonnelCount, sub: 'نفر کادر اداری', icon: Users, color: 'blue', search: '' },
                  { label: 'نمایندگی‌های رسمی', count: activeBranchesCount, sub: 'شعبه در ولایات', icon: Building2, color: 'emerald', search: 'نماینده' },
                  { label: 'اعضای هیئت نظار', count: boardMembersCount, sub: 'شورای نظارت عالی', icon: ShieldCheck, color: 'amber', search: 'نظار' },
                  { label: 'مدیران کلیدی', count: executiveCount, sub: 'کادر اجرایی ارشد', icon: Briefcase, color: 'purple', search: 'مدیر' },
                ].map((stat, i) => (
                  <div 
                    key={i}
                    onClick={() => setSearchTerm(stat.search)}
                    className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                      theme === 'dark'
                        ? `bg-slate-800/40 border-slate-700 hover:border-${stat.color}-500/50`
                        : `bg-slate-50/50 border-slate-100 hover:border-${stat.color}-200`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        theme === 'dark' ? `text-${stat.color}-400` : `text-${stat.color}-700`
                      }`}>{stat.label}</span>
                      <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${
                        theme === 'dark' ? `bg-${stat.color}-900/40 text-${stat.color}-400` : `bg-${stat.color}-100 text-${stat.color}-700`
                      }`}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono tracking-tighter">{stat.count}</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{stat.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Org Chart Layout Canvas */}
      <div className="max-w-7xl mx-auto overflow-x-auto pb-12 print:overflow-visible">
        <div 
          id="org-chart-export-canvas" 
          className={`min-w-[950px] flex flex-col items-center py-6 px-4 bg-white dark:bg-slate-900 rounded-2xl relative transition-all ${
            isEditMode && showGridLines
              ? `bg-[linear-gradient(to_right,#80808018_1px,transparent_1px),linear-gradient(to_bottom,#80808018_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] print:![background-image:none] ${gridDensity === 'small' ? 'bg-[size:12px_12px]' : gridDensity === 'large' ? 'bg-[size:48px_48px]' : 'bg-[size:24px_24px]'}`
              : ''
          } ${isEditMode && snapGridEnabled ? 'ring-2 ring-amber-400/40' : ''}`}
        >
          {/* Snap-to-Grid Blueprint Alignment Info Banner in Edit Mode */}
          {isEditMode && (
            <div className="w-full max-w-4xl mb-4 py-2 px-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-400/40 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 print:hidden dir-rtl">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {snapGridEnabled 
                    ? 'تراز چسبندگی مغناطیسی به شبکه (Magnetic Snap to Grid) و محدودکننده کادر فعال است' 
                    : 'تنظیمات شبکه و تراز چارت'}
                </span>
                {snappedIndicator && snapGridEnabled && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full text-[10px] shadow-sm animate-pulse">
                    تراز شده (X: {snappedIndicator?.x}px, Y: {snappedIndicator?.y}px)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 relative">
                <button
                  type="button"
                  onClick={() => setIsGridSettingsOpen(!isGridSettingsOpen)}
                  className="px-3 py-1.5 flex items-center gap-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  تنظیمات شبکه (Grid)
                </button>
                
                {isGridSettingsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden text-slate-800 dark:text-slate-200">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                      <h4 className="font-bold text-sm">تنظیمات تراز شبکه</h4>
                    </div>
                    <div className="p-3 flex flex-col gap-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold">تراز خودکار (Snap to Grid)</span>
                        <div className="relative inline-flex items-center">
                          <input type="checkbox" className="sr-only peer" checked={snapGridEnabled} onChange={() => setSnapGridEnabled(!snapGridEnabled)} />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                        </div>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold">نمایش خطوط (Show Grid)</span>
                        <div className="relative inline-flex items-center">
                          <input type="checkbox" className="sr-only peer" checked={showGridLines} onChange={() => setShowGridLines(!showGridLines)} />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                        </div>
                      </label>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold block mb-2">تراکم خطوط (Density)</span>
                        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                          <button
                            onClick={() => setGridDensity('small')}
                            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all ${gridDensity === 'small' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                            کوچک
                          </button>
                          <button
                            onClick={() => setGridDensity('medium')}
                            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all ${gridDensity === 'medium' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                            متوسط
                          </button>
                          <button
                            onClick={() => setGridDensity('large')}
                            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-md transition-all ${gridDensity === 'large' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          >
                            بزرگ
                          </button>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={handleResetNodePositions}
                          className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                          <span>بازنشانی جابه‌جایی گره‌ها</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Printable Official Header Banner with Custom Logo & Issue Date */}
          <div className="w-full max-w-4xl mb-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm flex flex-wrap items-center justify-between gap-6 text-slate-900 text-right dir-rtl">
            <div className="flex items-center gap-5">
              {customLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={customLogo || undefined}
                  alt="Company Logo"
                  className="w-20 h-20 object-contain border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-white shadow-sm shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-lg shadow-blue-500/20">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">شرکت صرافی و خدمات پولی برکت‌الله غفوری</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 font-bold mt-1">ساختار سازمانی و چارت تشکیلاتی رسمی (DAB Standard)</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] mt-2">
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300 font-bold">
                    DAB License: DAB/7-0965
                  </span>
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/30">
                    <strong className="text-blue-900 dark:text-blue-300">تاریخ اجرا:</strong>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={issueDate}
                        onChange={(e) => handleIssueDateChange(e.target.value)}
                        className="bg-transparent border-none p-0 text-xs font-mono font-black text-blue-950 dark:text-blue-100 w-24 focus:outline-none"
                        placeholder="1404/01/01"
                      />
                    ) : (
                      <span className="font-mono font-black text-blue-900 dark:text-blue-100">
                        {issueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col text-left dir-ltr font-mono text-[10px] text-slate-400 border-l pl-4 border-slate-100 dark:border-slate-800">
                <span className="font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">OFFICIAL DOCUMENT</span>
                <span className="text-slate-500 font-bold mt-1">Ref: DAB/7-0965/ORG</span>
                <span className="text-blue-600/60 font-bold">ID: {activeBranchesCount}.{boardMembersCount}.{totalPersonnelCount}</span>
              </div>
            </div>
          </div>

          {/* Active Branch Focus Mode Banner */}
          {selectedBranchFilter !== 'all' && selectedBranchObj && (
            <div className="w-full max-w-4xl mb-4 p-3 bg-blue-900 text-white border-2 border-blue-950 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 text-right dir-rtl print:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-800/80 rounded-xl border border-blue-700 shrink-0">
                  <Filter className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-blue-200">حالت نمای تمرکز تک‌صفحه‌ای:</span>
                    <span className="bg-amber-400 text-slate-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                      {selectedBranchObj?.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-100/90 mt-0.5">
                    نمایش اختصاصی <strong className="text-white">{selectedBranchObj?.name}</strong> با مسیر گزارش‌دهی به مدیر عملیاتی (<strong className="text-white">{operations?.name || ''}</strong>) و رئیس اجرائیه (<strong className="text-white">{president?.name || ''}</strong>).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchFilter('all')}
                className="bg-white hover:bg-slate-100 text-blue-950 font-extrabold px-3 py-1 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shadow-sm border border-blue-200 print:hidden flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-900" />
                نمای کامل
              </button>
            </div>
          )}
          
          {/* Level 1: President */}
          {president && (() => {
            const dragProps = getNodeDragProps(president!.key);
            return (
              <div className="flex flex-col items-center relative group">
                <div 
                  onPointerDown={dragProps.onPointerDown}
                  onPointerMove={dragProps.onPointerMove}
                  onPointerUp={dragProps.onPointerUp}
                  style={dragProps.style}
                  onClick={() => isEditMode && setEditingNode(president!)}
                  className={`bg-slate-900 dark:bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 w-80 text-center relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
                    isEditMode ? 'hover:ring-4 hover:ring-amber-400/30' : ''
                  } ${matchesSearch(president!) ? 'ring-4 ring-blue-500' : ''} ${dragProps.classNameAddons}`}
                >
                  {/* Top Gold/Amber Accent Line */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />

                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNode(president!);
                      }}
                      className="absolute top-3 right-3 bg-amber-500 text-slate-950 p-1.5 rounded-xl shadow-lg z-10 hover:bg-amber-400 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Print-Only 'Report To' Hierarchy Edge Badge */}
                  <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
                    <span className="text-amber-300 font-black">گزارش به:</span>
                    <span className="font-bold">مجمع عمومی سهمداران / DAB</span>
                  </div>

                  <div className="p-6">
                    <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3 text-amber-400">
                      <Award className="w-7 h-7" />
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-black mb-1">{president!.title}</div>
                    <div className="text-xl font-black tracking-tight">{president!.name}</div>
                    <div className="text-[10px] text-slate-400 mt-2 font-bold tracking-widest uppercase">Chairman & Founder</div>
                  </div>
                </div>

                {/* Vertical connector */}
                <div className={`h-8 w-px ${themeStyle.connector} opacity-50`}></div>
              </div>
            );
          })()}

          {/* Level 2: Board of Supervisors Box */}
          <div className="flex flex-col items-center relative w-full max-w-5xl">
            <div className={`${theme === 'dark' ? 'bg-slate-800/40' : 'bg-slate-50/50'} rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs w-full transition-colors`}>
              <div className="text-center mb-8">
                <span className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-black tracking-wide shadow-xs ${
                  theme === 'dark' ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-white text-blue-900 border border-slate-200'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  هیئت نظار • شورای نظارت عالی شرکت
                </span>
              </div>

              {/* Board Members Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {boardMembers.map((member) => {
                  const dragProps = getNodeDragProps(member.key);
                  return (
                    <div 
                      key={member.key}
                      onPointerDown={dragProps.onPointerDown}
                      onPointerMove={dragProps.onPointerMove}
                      onPointerUp={dragProps.onPointerUp}
                      style={dragProps.style}
                      onClick={() => isEditMode && setEditingNode(member)}
                      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xs border transition-all duration-300 relative overflow-hidden hover:shadow-xl hover:-translate-y-1 ${
                        isEditMode ? 'hover:ring-2 hover:ring-amber-400' : ''
                      } ${matchesSearch(member) ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200/90 dark:border-slate-800'} ${dragProps.classNameAddons}`}
                    >
                      {/* Top Indigo Gradient Accent Line */}
                      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600" />

                      {isEditMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNode(member);
                          }}
                          className="absolute top-3 right-3 bg-amber-500 text-slate-950 p-1.5 rounded-xl z-10 hover:bg-amber-400 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Print-Only 'Report To' Hierarchy Edge Badge */}
                      <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
                        <span className="text-amber-300 font-black">گزارش به:</span>
                        <span className="font-bold">مجمع عمومی / رئیس هیئت مدیره</span>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                            عضو هیئت نظار
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">{member.title}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white leading-snug">{member.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vertical Connector Down to Sub-units */}
              <div className="relative flex justify-center">
                <div className={`w-px h-6 ${themeStyle.connector} opacity-50`}></div>
              </div>

              {/* Level 3: Operations Manager & Compliance Officer */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                
                {/* Left Side: Operations Manager & Regional Reps */}
                <div className="flex flex-col items-center">
                  {operations && (() => {
                    const dragProps = getNodeDragProps(operations!.key);
                    return (
                      <div 
                        onPointerDown={dragProps.onPointerDown}
                        onPointerMove={dragProps.onPointerMove}
                        onPointerUp={dragProps.onPointerUp}
                        style={dragProps.style}
                        onClick={() => isEditMode && setEditingNode(operations!)}
                        className={`bg-slate-900 dark:bg-slate-900 text-white rounded-2xl shadow-xl w-full max-w-xs text-center relative transition-all duration-300 overflow-hidden hover:shadow-2xl hover:-translate-y-1 border border-slate-800 ${
                          isEditMode ? 'hover:ring-2 hover:ring-amber-400' : ''
                        } ${matchesSearch(operations!) ? 'ring-4 ring-blue-500/30' : ''} ${dragProps.classNameAddons}`}
                      >
                        {/* Top Deep Blue Accent Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600" />

                        {isEditMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNode(operations!);
                            }}
                            className="absolute top-3 right-3 bg-amber-500 text-slate-950 p-1.5 rounded-xl z-10 hover:bg-amber-400 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Print-Only 'Report To' Hierarchy Edge Badge */}
                        <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
                          <span className="text-amber-300 font-black">گزارش به:</span>
                          <span className="font-bold">رئیس هیئت مدیره ({president?.name || ''})</span>
                        </div>

                        <div className="p-5">
                          <div className="inline-flex p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3 text-blue-400">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">{operations!.title}</div>
                          <div className="text-base font-black">{operations!.name}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Regional Representatives - Peer Level under Operations Manager */}
                  <div className="w-full mt-4">
                    <div className="flex flex-wrap items-center justify-between mb-4 px-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">نماینده‌ها و شبکه نمایندگی‌های ولایتی</span>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
                          تحت اثر مدیر بخش عملیاتی
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedBranchFilter !== 'all' && (
                          <button
                            onClick={() => setSelectedBranchFilter('all')}
                            className="text-[10px] bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-full font-black transition-all cursor-pointer shadow-md"
                          >
                            نمایش همه
                          </button>
                        )}
                        {isEditMode && (
                          <button
                            onClick={handleAddRepresentative}
                            className="flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full font-black transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            افزودن
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tree connector graphic for peer-level branches */}
                    <div className="relative w-full">
                      {/* Central vertical drop line from Operations Manager */}
                      <div className="w-1 h-5 mx-auto bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>
                      
                      {/* Horizontal tree line linking peer branches */}
                      {filteredBranches.length > 1 && (
                        <div className="h-1 w-[90%] mx-auto bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                      )}

                      {/* Peer Representatives Grid on same horizontal row */}
                      <div className={`grid gap-4 mt-0 ${
                        filteredBranches.length === 1 
                          ? 'grid-cols-1 max-w-sm mx-auto' 
                          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      }`}>
                        {filteredBranches.map((branch) => {
                          const dragProps = getNodeDragProps(branch.key);
                          return (
                            <div key={branch.key} className="flex flex-col items-center">
                              {/* Individual drop line to node */}
                              <div className="w-1 h-4 bg-blue-600 dark:bg-blue-400"></div>

                              <div 
                                onPointerDown={dragProps.onPointerDown}
                                onPointerMove={dragProps.onPointerMove}
                                onPointerUp={dragProps.onPointerUp}
                                style={dragProps.style}
                                onClick={() => isEditMode && setEditingNode(branch)}
                                className={`bg-white dark:bg-slate-900 rounded-2xl border text-center shadow-xs relative transition-all duration-300 w-full overflow-hidden hover:shadow-xl hover:-translate-y-1 ${
                                  isEditMode ? 'hover:ring-2 hover:ring-amber-400' : ''
                                } ${matchesSearch(branch) ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/90 dark:border-slate-800'} ${
                                  selectedBranchFilter === branch.key ? 'border-blue-600 ring-4 ring-blue-600/10' : ''
                                } ${dragProps.classNameAddons}`}
                              >
                                {/* Top Teal Accent Line */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500" />

                                {isEditMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingNode(branch);
                                    }}
                                    className="absolute top-3 right-3 bg-amber-500 text-slate-950 p-1 rounded-lg z-10 hover:bg-amber-400 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}

                                <div className="p-4">
                                  <div className="flex items-center justify-end mb-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBranchFilter(selectedBranchFilter === branch.key ? 'all' : branch.key);
                                      }}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        selectedBranchFilter === branch.key
                                          ? 'bg-teal-600 text-white shadow-md'
                                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      <Filter className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="text-[11px] font-black text-teal-600 dark:text-teal-400 mb-1">{branch.title}</div>
                                  <div className="text-sm font-black text-slate-900 dark:text-white leading-tight">{branch.name}</div>
                                  <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
                                    <span className="text-amber-300 font-black">گزارش به:</span>
                                    <span className="font-bold">مدیر بخش عملیاتی ({operations?.name || ''})</span>
                                  </div>
                                  <div className="text-[10px] text-teal-800 dark:text-teal-300 font-extrabold bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-full mt-2.5 border border-teal-100 dark:border-teal-900/40 inline-block print:hidden">
                                    گزارش به: مدیر بخش عملیاتی
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Compliance Officer */}
                <div className="flex flex-col items-center justify-start">
                  {compliance && (() => {
                    const dragProps = getNodeDragProps(compliance!.key);
                    return (
                      <div 
                        onPointerDown={dragProps.onPointerDown}
                        onPointerMove={dragProps.onPointerMove}
                        onPointerUp={dragProps.onPointerUp}
                        style={dragProps.style}
                        onClick={() => isEditMode && setEditingNode(compliance!)}
                        className={`bg-slate-900 dark:bg-slate-900 text-white rounded-2xl shadow-xl w-full max-w-xs text-center relative transition-all duration-300 overflow-hidden hover:shadow-2xl hover:-translate-y-1 border border-slate-800 ${
                          isEditMode ? 'hover:ring-2 hover:ring-amber-400' : ''
                        } ${matchesSearch(compliance!) ? 'ring-4 ring-blue-500/30' : ''} ${dragProps.classNameAddons}`}
                      >
                        {/* Top Emerald Gradient Line */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600" />

                        {isEditMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNode(compliance!);
                            }}
                            className="absolute top-3 right-3 bg-amber-500 text-slate-950 p-1.5 rounded-xl z-10 hover:bg-amber-400 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Print-Only 'Report To' Hierarchy Edge Badge */}
                        <div className="hidden print:flex print-reports-to-label absolute top-2 right-3 bg-[#1e3a8a] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-700 shadow-xs z-30 items-center gap-1 dir-rtl whitespace-nowrap">
                          <span className="text-amber-300 font-black">گزارش به:</span>
                          <span className="font-bold">هیئت نظار و د افغانستان بانک</span>
                        </div>

                        <div className="p-5">
                          <div className="inline-flex p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-3 text-emerald-400">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1">{compliance!.title}</div>
                          <div className="text-base font-black">{compliance!.name}</div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-4 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl text-[11px] font-bold text-emerald-900 dark:text-emerald-300 text-center max-w-xs leading-relaxed shadow-xs">
                    {compliance?.description || 'مسئول مستقیم رعایت مقررات و قوانین بانکی (AML/CFT) با مسیر گزارش‌دهی مستقیم به هیئت نظار.'}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Modal Dialog */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-lg">ویرایش اطلاعات بخش سازمانی</h3>
              </div>
              <button 
                onClick={() => setEditingNode(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingNode) handleUpdateNode(editingNode);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان / سمت سازمانی</label>
                <input
                  type="text"
                  value={editingNode?.title || ''}
                  onChange={(e) => editingNode && setEditingNode({ ...editingNode, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام کامل و نام پدر (ولد)</label>
                <input
                  type="text"
                  value={editingNode?.name || ''}
                  onChange={(e) => editingNode && setEditingNode({ ...editingNode, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
                {editingNode?.category === 'branch' ? (
                  <button
                    type="button"
                    onClick={() => editingNode && handleDeleteNode(editingNode.key)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف نمایندگی
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNode(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    ذخیره تغییرات
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Footer Info / Summary stats */}
      <div className={`max-w-7xl mx-auto mt-8 border-t pt-6 flex flex-col sm:flex-row items-center justify-between text-xs ${themeStyle.subText} print:hidden ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <div>مجموع پرسنل ثبت‌شده در چارت: {personnel.length} نفر | نسخه رسمی استاندارد برای د افغانستان بانک (DAB)</div>
        <div className="mt-2 sm:mt-0">شرکت صرافی و خدمات پولی برکت‌الله غفوری © تمامی حقوق محفوظ است.</div>
      </div>
      </main>

      {/* Company Logo Upload Modal */}
      <CompanyLogoModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        logoUrl={customLogo}
        onSaveLogo={handleSaveLogo}
      />

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                تغییر رمز عبور
              </h3>
              <button onClick={() => setIsChangePasswordOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 text-sm font-semibold text-red-700 bg-red-100 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-center">
                  {passwordError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رمز عبور جدید</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:text-white text-left outline-none transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={async () => {
                  try {
                    setPasswordError(null);
                    if (newPassword.length < 6) {
                      setPasswordError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
                      return;
                    }
                    await changePassword(newPassword);
                    setIsChangePasswordOpen(false);
                    setNewPassword('');
                    alert('رمز عبور با موفقیت تغییر یافت.');
                  } catch (e: any) {
                    console.error(e);
                    setPasswordError('خطایی رخ داد. آیا اخیراً وارد شده‌اید؟ (نیاز به لاگین مجدد)');
                  }
                }}
                disabled={!newPassword}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                ذخیره رمز جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High Quality PDF & Word Export Modal */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        targetElementId={getPdfExportConfig().targetId}
        defaultTitle={getPdfExportConfig().title}
        defaultFilename={getPdfExportConfig().filename}
        initialFormat={exportInitialFormat}
      />

      {/* Full-Screen Print Preview Simulation Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        targetElementId={getPdfExportConfig().targetId}
        documentTitle={getPdfExportConfig().title}
        onOpenPdfExport={() => {
          setIsPrintPreviewOpen(false);
          setIsPdfModalOpen(true);
        }}
      />

      {/* Off-screen Document Staging for Batch PDF Compilation */}
      <BatchExportStaging
        selectedDocIds={batchSelectedIds}
        customLogo={customLogo}
        companyId={activeCompanyId}
        includeCoverPage={true}
        companyName={companies.find((c) => c.id === activeCompanyId)?.name || 'شرکت صرافی و خدمات پولی برکت‌الله غفوری'}
        licenseNumber="DAB/7-0965"
        issueDate={issueDate}
        selectedDocsMeta={batchDocsMeta}
      />

      {/* Batch Export PDF Modal */}
      <BatchExportModal
        isOpen={isBatchExportModalOpen}
        onClose={() => setIsBatchExportModalOpen(false)}
        companyName={companies.find((c) => c.id === activeCompanyId)?.name || 'شرکت صرافی و خدمات پولی برکت‌الله غفوری'}
        licenseNumber="DAB/7-0965"
        issueDate={issueDate}
        onSelectedDocsChange={(selectedIds, meta) => {
          setBatchSelectedIds(selectedIds);
          setBatchDocsMeta(meta);
        }}
      />
    </div>
  );
}


