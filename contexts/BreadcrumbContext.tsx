import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface BreadcrumbItem {
  id: string;
  label: string;
  page: string;
  data?: Record<string, any>;
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  pushBreadcrumb: (item: BreadcrumbItem) => void;
  popBreadcrumb: () => void;
  goToBreadcrumb: (index: number) => BreadcrumbItem | null;
  clearBreadcrumbs: () => void;
  replaceLastBreadcrumb: (item: BreadcrumbItem) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('guardian_breadcrumbs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [{ id: 'dashboard', label: 'Dashboard', page: 'dashboard' }];
        }
      }
    }
    return [{ id: 'dashboard', label: 'Dashboard', page: 'dashboard' }];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('guardian_breadcrumbs', JSON.stringify(breadcrumbs));
    }
  }, [breadcrumbs]);

  const pushBreadcrumb = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs((prev) => {
      const existingIndex = prev.findIndex((b) => b.page === item.page);
      if (existingIndex !== -1) {
        return [...prev.slice(0, existingIndex), item];
      }
      return [...prev, item];
    });
  }, []);

  const popBreadcrumb = useCallback(() => {
    setBreadcrumbs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const goToBreadcrumb = useCallback((index: number): BreadcrumbItem | null => {
    if (index < 0 || index >= breadcrumbs.length) return null;
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    return target;
  }, [breadcrumbs]);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([{ id: 'dashboard', label: 'Dashboard', page: 'dashboard' }]);
  }, []);

  const replaceLastBreadcrumb = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs((prev) => {
      if (prev.length === 0) return [item];
      return [...prev.slice(0, -1), item];
    });
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{
        breadcrumbs,
        pushBreadcrumb,
        popBreadcrumb,
        goToBreadcrumb,
        clearBreadcrumbs,
        replaceLastBreadcrumb,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
}
