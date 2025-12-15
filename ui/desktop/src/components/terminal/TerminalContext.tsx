import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  shell?: string;
  isActive: boolean;
  ptyCreated: boolean; // Track if PTY process has been spawned
}

interface TerminalContextType {
  terminals: TerminalSession[];
  activeTerminalId: string | null;
  addTerminal: (options?: { title?: string; cwd?: string; shell?: string }) => string;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  updateTerminalTitle: (id: string, title: string) => void;
  markPtyCreated: (id: string) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const addTerminal = useCallback(
    (options?: { title?: string; cwd?: string; shell?: string }) => {
      const id = uuidv4();
      const cwd =
        options?.cwd || (window.appConfig?.get('MTS_WORKING_DIR') as string) || '';
      const newTerminal: TerminalSession = {
        id,
        title: options?.title || `Terminal ${terminals.length + 1}`,
        cwd,
        shell: options?.shell,
        isActive: true,
        ptyCreated: false,
      };

      setTerminals((prev) => [...prev, newTerminal]);
      setActiveTerminalId(id);
      return id;
    },
    [terminals.length]
  );

  const removeTerminal = useCallback(
    (id: string) => {
      window.electron.ptyKill(id);
      setTerminals((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTerminalId === id && filtered.length > 0) {
          setActiveTerminalId(filtered[filtered.length - 1].id);
        } else if (filtered.length === 0) {
          setActiveTerminalId(null);
        }
        return filtered;
      });
    },
    [activeTerminalId]
  );

  const setActiveTerminal = useCallback((id: string) => {
    setActiveTerminalId(id);
  }, []);

  const updateTerminalTitle = useCallback((id: string, title: string) => {
    setTerminals((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const markPtyCreated = useCallback((id: string) => {
    setTerminals((prev) => prev.map((t) => (t.id === id ? { ...t, ptyCreated: true } : t)));
  }, []);

  // Note: We don't cleanup terminals on unmount because TerminalProvider
  // is at the app root level and terminals should persist across navigation.
  // PTYs are only killed when explicitly closed via removeTerminal().

  return (
    <TerminalContext.Provider
      value={{
        terminals,
        activeTerminalId,
        addTerminal,
        removeTerminal,
        setActiveTerminal,
        updateTerminalTitle,
        markPtyCreated,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminalContext = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within TerminalProvider');
  }
  return context;
};
