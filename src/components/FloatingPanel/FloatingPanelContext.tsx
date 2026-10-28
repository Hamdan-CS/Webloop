import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type PanelTab = 'messages' | 'tasks';

interface FloatingPanelContextValue {
  isOpen: boolean;
  activeTab: PanelTab;
  openPanel: (tab: PanelTab) => void;
  closePanel: () => void;
  setActiveTab: (tab: PanelTab) => void;
}

const FloatingPanelContext = createContext<FloatingPanelContextValue | null>(null);

export function useFloatingPanel() {
  const ctx = useContext(FloatingPanelContext);
  if (!ctx) throw new Error('useFloatingPanel must be used within FloatingPanelProvider');
  return ctx;
}

export function FloatingPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('messages');

  const openPanel = useCallback((tab: PanelTab) => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => setIsOpen(false), []);

  return (
    <FloatingPanelContext.Provider value={{ isOpen, activeTab, openPanel, closePanel, setActiveTab }}>
      {children}
    </FloatingPanelContext.Provider>
  );
}
