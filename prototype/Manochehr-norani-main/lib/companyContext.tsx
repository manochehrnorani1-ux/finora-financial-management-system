'use client';
import React, { createContext, useContext, useState } from 'react';

export interface CompanyInfo {
  id: string;
  name: string;
  licenseNo: string;
}

interface CompanyContextType {
  companies: CompanyInfo[];
  activeCompanyId: string;
  activeCompany: CompanyInfo;
  setActiveCompanyId: (id: string) => void;
  addCompany: (company: CompanyInfo) => void;
  updateCompany: (id: string, updates: Partial<CompanyInfo>) => void;
  deleteCompany: (id: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const DEFAULT_COMPANIES: CompanyInfo[] = [
  { id: 'default', name: 'شرکت صرافی و خدمات پولی برکت‌الله غفوری', licenseNo: '7-0965' }
];

function getInitialCompanies(): CompanyInfo[] {
  if (typeof window === 'undefined') {
    return DEFAULT_COMPANIES;
  }

  try {
    const saved = localStorage.getItem('bg_companies_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CompanyInfo[];
      }
    }
  } catch (e) {
    console.error(e);
  }

  return DEFAULT_COMPANIES;
}

function getInitialActiveCompanyId(): string {
  if (typeof window === 'undefined') {
    return 'default';
  }

  try {
    return localStorage.getItem('bg_active_company_id') || 'default';
  } catch (e) {
    console.error(e);
    return 'default';
  }
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<CompanyInfo[]>(getInitialCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(getInitialActiveCompanyId);

  const saveAndSetCompanies = (newCompanies: CompanyInfo[]) => {
    setCompanies(newCompanies);
    try {
      localStorage.setItem('bg_companies_list', JSON.stringify(newCompanies));
    } catch (_) {}
  };

  const handleSetActiveCompanyId = (id: string) => {
    setActiveCompanyId(id);
    try {
      localStorage.setItem('bg_active_company_id', id);
    } catch (_) {}
  };

  const addCompany = (company: CompanyInfo) => {
    saveAndSetCompanies([...companies, company]);
  };

  const updateCompany = (id: string, updates: Partial<CompanyInfo>) => {
    saveAndSetCompanies(companies.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCompany = (id: string) => {
    const newCompanies = companies.filter(c => c.id !== id);
    saveAndSetCompanies(newCompanies);
    if (activeCompanyId === id && newCompanies.length > 0) {
      handleSetActiveCompanyId(newCompanies[0].id);
    }
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0] || DEFAULT_COMPANIES[0];

  return (
    <CompanyContext.Provider value={{
      companies,
      activeCompanyId,
      activeCompany,
      setActiveCompanyId: handleSetActiveCompanyId,
      addCompany,
      updateCompany,
      deleteCompany
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
