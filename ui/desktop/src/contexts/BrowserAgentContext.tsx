import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// Types for browser commands and events
export type BrowserCommandType = 'navigate' | 'click' | 'type' | 'extract' | 'screenshot' | 'execute';
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface BrowserCommand {
  id: string;
  type: BrowserCommandType;
  params: Record<string, any>;
  timestamp: number;
}

export interface BrowserAgentState {
  currentUrl: string;
  isLoading: boolean;
  isVisible: boolean;
  commandQueue: BrowserCommand[];
  connectionStatus: ConnectionStatus;
}

export interface BrowserEvent {
  type: string;
  command_id?: string;
  success?: boolean;
  data?: any;
  error?: string;
  url?: string;
  loading?: boolean;
  allowed_domains?: string[];
}

interface WebviewTag extends HTMLElement {
  src: string;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  addEventListener(
    type: 'did-start-loading' | 'did-stop-loading' | 'did-navigate' | 'did-fail-load' | 'crashed',
    listener: (event: Event & { url?: string; errorCode?: number; errorDescription?: string }) => void
  ): void;
  removeEventListener(
    type: 'did-start-loading' | 'did-stop-loading' | 'did-navigate' | 'did-fail-load' | 'crashed',
    listener: (event: Event & { url?: string; errorCode?: number; errorDescription?: string }) => void
  ): void;
}

interface BrowserAgentContextValue {
  state: BrowserAgentState;
  webviewRef: React.RefObject<WebviewTag | null>;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  executeCommand: (command: BrowserCommand) => Promise<any>;
  sendWebSocketMessage: (message: any) => void;
}

const defaultState: BrowserAgentState = {
  currentUrl: 'https://google.com',
  isLoading: false,
  isVisible: false,
  commandQueue: [],
  connectionStatus: 'disconnected',
};

const BrowserAgentContext = createContext<BrowserAgentContextValue | null>(null);

const STORAGE_KEY = 'mts-browser-state';
const WS_URL = 'ws://localhost:3000/ws/browser';
const WS_RECONNECT_DELAY = 1000; // Start with 1 second
const WS_MAX_RECONNECT_DELAY = 30000; // Max 30 seconds

export function BrowserAgentProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<BrowserAgentState>(() => {
    // Try to restore from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          isVisible: location.pathname === '/browser',
          connectionStatus: 'disconnected' as ConnectionStatus,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...defaultState, isVisible: location.pathname === '/browser' };
  });

  const webviewRef = useRef<WebviewTag | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(WS_RECONNECT_DELAY);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Update visibility based on route
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isVisible: location.pathname === '/browser',
    }));
  }, [location.pathname]);

  // Persist state to localStorage (except connectionStatus)
  useEffect(() => {
    try {
      const { connectionStatus, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    console.log('[BrowserAgent] Connecting to WebSocket:', WS_URL);
    setState(prev => ({ ...prev, connectionStatus: 'reconnecting' }));

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[BrowserAgent] WebSocket connected');
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        reconnectDelayRef.current = WS_RECONNECT_DELAY; // Reset delay on successful connection

        // Process queued commands
        setState(prev => {
          if (prev.commandQueue.length > 0) {
            console.log('[BrowserAgent] Processing', prev.commandQueue.length, 'queued commands');
            prev.commandQueue.forEach(cmd => {
              ws.send(JSON.stringify(cmd));
            });
            return { ...prev, commandQueue: [] };
          }
          return prev;
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: BrowserEvent = JSON.parse(event.data);
          console.log('[BrowserAgent] Received message:', message);
          handleBrowserEvent(message);
        } catch (error) {
          console.error('[BrowserAgent] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[BrowserAgent] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[BrowserAgent] WebSocket closed, reconnecting...');
        setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        wsRef.current = null;

        // Exponential backoff reconnection
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            WS_MAX_RECONNECT_DELAY
          );
          connectWebSocket();
        }, reconnectDelayRef.current);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[BrowserAgent] Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));

      // Retry connection
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, reconnectDelayRef.current);
    }
  }, []);

  // Handle browser events from backend
  const handleBrowserEvent = useCallback((event: BrowserEvent) => {
    switch (event.type) {
      case 'NavigationComplete':
        if (event.url) {
          setState(prev => ({ ...prev, currentUrl: event.url!, isLoading: false }));
        }
        break;

      case 'LoadingStateChanged':
        setState(prev => ({ ...prev, isLoading: event.loading ?? false }));
        break;

      case 'CommandResult':
        // Handle command result (can be extended for promise resolution)
        console.log('[BrowserAgent] Command result:', event);
        break;

      case 'ConsentRequired':
        // Handle consent dialog (will implement in later phase)
        console.log('[BrowserAgent] Consent required for domains:', event.allowed_domains);
        break;

      case 'Error':
        console.error('[BrowserAgent] Backend error:', event.error);
        break;

      default:
        console.warn('[BrowserAgent] Unknown event type:', event.type);
    }
  }, []);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Setup webview event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleDidStopLoading = () => {
      setState(prev => ({ ...prev, isLoading: false }));
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleDidNavigate = (e: Event & { url?: string }) => {
      if (e.url) {
        setState(prev => ({ ...prev, currentUrl: e.url! }));
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());

        // Notify backend of navigation
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'NavigationComplete',
            url: e.url,
          }));
        }
      }
    };

    const handleDidFailLoad = (e: Event & { errorCode?: number; errorDescription?: string }) => {
      console.error('[BrowserAgent] Load failed:', e.errorCode, e.errorDescription);
      setState(prev => ({ ...prev, isLoading: false }));
    };

    const handleCrashed = () => {
      console.error('[BrowserAgent] Webview crashed, reloading...');
      setState(prev => ({ ...prev, isLoading: false }));
      // Auto-reload on crash
      setTimeout(() => {
        webview.reload();
      }, 1000);
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('crashed', handleCrashed);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('crashed', handleCrashed);
    };
  }, []);

  // Navigation methods
  const navigate = useCallback((url: string) => {
    let target = url;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    setState(prev => ({ ...prev, currentUrl: target }));
  }, []);

  const goBack = useCallback(() => {
    webviewRef.current?.goBack();
  }, []);

  const goForward = useCallback(() => {
    webviewRef.current?.goForward();
  }, []);

  const reload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  const stop = useCallback(() => {
    webviewRef.current?.stop();
  }, []);

  // Execute command (for agent control)
  const executeCommand = useCallback(async (command: BrowserCommand): Promise<any> => {
    console.log('[BrowserAgent] Executing command:', command);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
      // TODO: Return a promise that resolves when command completes
      return Promise.resolve();
    } else {
      // Queue command if disconnected
      console.log('[BrowserAgent] WebSocket not connected, queuing command');
      setState(prev => ({
        ...prev,
        commandQueue: [...prev.commandQueue, command],
      }));
      return Promise.reject(new Error('WebSocket not connected'));
    }
  }, []);

  // Send raw WebSocket message (for advanced use cases)
  const sendWebSocketMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[BrowserAgent] Cannot send message, WebSocket not connected');
    }
  }, []);

  const value: BrowserAgentContextValue = {
    state,
    webviewRef,
    navigate,
    goBack,
    goForward,
    reload,
    stop,
    canGoBack,
    canGoForward,
    executeCommand,
    sendWebSocketMessage,
  };

  return (
    <BrowserAgentContext.Provider value={value}>
      {/* Global webview - always mounted, visibility controlled by CSS */}
      <div
        style={{
          position: 'fixed',
          top: state.isVisible ? '0' : '-10000px',
          left: 0,
          width: state.isVisible ? '100%' : '1px',
          height: state.isVisible ? '100%' : '1px',
          zIndex: state.isVisible ? 1000 : -1000,
          pointerEvents: state.isVisible ? 'auto' : 'none',
          display: state.isVisible ? 'block' : 'none',
        }}
      >
        <webview
          ref={webviewRef}
          src={state.currentUrl}
          style={{ width: '100%', height: '100%' }}
          // @ts-ignore - webpreferences is a valid attribute for webview
          webpreferences="backgroundThrottling=no"
        />
      </div>
      {children}
    </BrowserAgentContext.Provider>
  );
}

export function useBrowserAgent(): BrowserAgentContextValue {
  const context = useContext(BrowserAgentContext);
  if (!context) {
    throw new Error('useBrowserAgent must be used within a BrowserAgentProvider');
  }
  return context;
}
