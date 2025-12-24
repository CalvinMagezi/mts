import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

export interface ActiveSessionState {
  sessionId: string | null;
  agentStatus: AgentStatus;
  lastActivity: Date | null;
}

interface ActiveSessionContextValue {
  activeSession: ActiveSessionState;
  setActiveSession: (sessionId: string, status: AgentStatus) => void;
  updateStatus: (status: AgentStatus) => void;
  clearActiveSession: () => void;
  isAgentRunning: boolean;
}

const defaultState: ActiveSessionState = {
  sessionId: null,
  agentStatus: 'idle',
  lastActivity: null,
};

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

const STORAGE_KEY = 'mts-active-session';

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSessionState] = useState<ActiveSessionState>(() => {
    // Try to restore from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultState;
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession));
    } catch {
      // Ignore storage errors
    }
  }, [activeSession]);

  // Listen for storage events from other windows
  useEffect(() => {
    const handleStorageChange = (e: globalThis.StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveSessionState({
            ...parsed,
            lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null,
          });
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setActiveSession = useCallback((sessionId: string, status: AgentStatus) => {
    setActiveSessionState({
      sessionId,
      agentStatus: status,
      lastActivity: new Date(),
    });
  }, []);

  const updateStatus = useCallback((status: AgentStatus) => {
    setActiveSessionState((prev) => ({
      ...prev,
      agentStatus: status,
      lastActivity: new Date(),
    }));
  }, []);

  const clearActiveSession = useCallback(() => {
    setActiveSessionState(defaultState);
  }, []);

  const isAgentRunning = activeSession.agentStatus === 'running';

  return (
    <ActiveSessionContext.Provider
      value={{
        activeSession,
        setActiveSession,
        updateStatus,
        clearActiveSession,
        isAgentRunning,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession(): ActiveSessionContextValue {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
}
