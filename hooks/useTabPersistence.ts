import { useState, useEffect, useCallback } from 'react';

interface UseTabPersistenceOptions {
  storageKey: string;
  defaultValue: string;
  persistDuration?: number;
}

export function useTabPersistence({ 
  storageKey, 
  defaultValue,
  persistDuration = 0
}: UseTabPersistenceOptions) {
  const fullKey = `guardian_tab_${storageKey}`;
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const saved = sessionStorage.getItem(fullKey);
      if (saved) {
        const { value, timestamp, duration } = JSON.parse(saved);
        
        if (duration > 0 && Date.now() - timestamp > duration) {
          sessionStorage.removeItem(fullKey);
          return defaultValue;
        }
        
        return value;
      }
    } catch {
      // Invalid JSON, ignore
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const data = {
      value: activeTab,
      timestamp: Date.now(),
      duration: persistDuration
    };
    
    sessionStorage.setItem(fullKey, JSON.stringify(data));
  }, [activeTab, fullKey, persistDuration]);

  const setTab = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const clearPersistedTab = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(fullKey);
    }
    setActiveTab(defaultValue);
  }, [fullKey, defaultValue]);

  const resetToDefault = useCallback(() => {
    setActiveTab(defaultValue);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(fullKey);
    }
  }, [defaultValue, fullKey]);

  return {
    activeTab,
    setTab,
    clearPersistedTab,
    resetToDefault
  };
}

export function useMultiTabPersistence(
  tabs: { id: string; storageKey: string; defaultValue: string }[]
) {
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') {
      return tabs.reduce((acc, tab) => ({ ...acc, [tab.id]: tab.defaultValue }), {});
    }
    
    const initial: Record<string, string> = {};
    
    tabs.forEach((tab) => {
      const fullKey = `guardian_tab_${tab.storageKey}`;
      try {
        const saved = sessionStorage.getItem(fullKey);
        if (saved) {
          const { value } = JSON.parse(saved);
          initial[tab.id] = value;
        } else {
          initial[tab.id] = tab.defaultValue;
        }
      } catch {
        initial[tab.id] = tab.defaultValue;
      }
    });
    
    return initial;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    Object.entries(activeTabs).forEach(([id, value]) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        const fullKey = `guardian_tab_${tab.storageKey}`;
        const data = {
          value,
          timestamp: Date.now(),
          duration: 0
        };
        sessionStorage.setItem(fullKey, JSON.stringify(data));
      }
    });
  }, [activeTabs, tabs]);

  const setTab = useCallback((id: string, value: string) => {
    setActiveTabs((prev) => ({ ...prev, [id]: value }));
  }, []);

  return {
    activeTabs,
    setTab
  };
}

export default useTabPersistence;
