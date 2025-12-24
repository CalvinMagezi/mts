import { useEffect, useRef, useCallback, useState } from 'react';
import { useActiveSession } from '../contexts/ActiveSessionContext';
import { Message } from '../api';

interface StreamMessageEvent {
  type: string;
  message?: Message;
  error?: string;
  reason?: string;
}

interface GlobalStreamState {
  bufferedMessages: Message[];
  isConnected: boolean;
  consumeBufferedMessages: () => Message[];
}

/**
 * Global stream manager that maintains connection to background agent tasks
 * and triggers notifications when agent completes.
 *
 * This hook should be used at the App level to maintain connection even when
 * navigating away from the chat view.
 */
export function useGlobalStream(): GlobalStreamState {
  const { activeSession, updateStatus } = useActiveSession();
  const [bufferedMessages, setBufferedMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<globalThis.EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Trigger native notification
  const triggerNotification = useCallback(
    (title: string, body: string) => {
      // Only notify if app is not focused
      if (!document.hasFocus() && activeSession.sessionId) {
        window.electron?.showNotification?.({
          title,
          body,
          data: { sessionId: activeSession.sessionId },
        });
      }
    },
    [activeSession.sessionId]
  );

  // Check task status from backend via direct fetch
  const checkTaskStatus = useCallback(async () => {
    if (!activeSession.sessionId) return;

    const baseUrl = window.appConfig?.get('GOOSE_API_HOST') || 'http://127.0.0.1:3000';
    const url = `${baseUrl}/sessions/${activeSession.sessionId}/task-status`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const status = data.status;
        if (status === 'Completed') {
          updateStatus('completed');
        } else if (status === 'Error') {
          updateStatus('error');
        } else if (status === 'Cancelled') {
          updateStatus('cancelled');
        }
        // If still 'Running', keep the current status
      } else if (response.status === 404) {
        // No task is running - task must have completed or never started
        updateStatus('idle');
      }
    } catch {
      // Network error or other issue - assume task completed
      updateStatus('idle');
    }
  }, [activeSession.sessionId, updateStatus]);

  // Connect to background task stream
  const connect = useCallback(() => {
    if (!activeSession.sessionId || activeSession.agentStatus !== 'running') {
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseUrl = window.appConfig?.get('GOOSE_API_HOST') || 'http://127.0.0.1:3000';
    const url = `${baseUrl}/sessions/${activeSession.sessionId}/subscribe`;

    try {
      const eventSource = new globalThis.EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        retryCountRef.current = 0; // Reset retry count on successful connection
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data: StreamMessageEvent = JSON.parse(event.data);

          switch (data.type) {
            case 'Message':
              if (data.message) {
                setBufferedMessages((prev) => [...prev, data.message!]);
                // Notify about new message
                triggerNotification('MTS Agent', 'Agent has responded');
              }
              break;
            case 'Finish':
              updateStatus('completed');
              triggerNotification('MTS Agent', 'Agent has completed');
              eventSource.close();
              setIsConnected(false);
              break;
            case 'Error':
              updateStatus('error');
              triggerNotification('MTS Agent', `Error: ${data.error || 'Unknown error'}`);
              break;
            case 'Ping':
              // Heartbeat, ignore
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        retryCountRef.current += 1;

        // After 3 failed retries, check task status to see if it actually finished
        if (retryCountRef.current >= 3) {
          checkTaskStatus();
          retryCountRef.current = 0;
        } else if (activeSession.agentStatus === 'running') {
          // Attempt reconnect after delay
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000);
        }
      };
    } catch {
      // Connection failed
      setIsConnected(false);
      checkTaskStatus();
    }
  }, [
    activeSession.sessionId,
    activeSession.agentStatus,
    updateStatus,
    triggerNotification,
    checkTaskStatus,
  ]);

  // Connect when active session changes to running
  useEffect(() => {
    if (activeSession.sessionId && activeSession.agentStatus === 'running') {
      // First check if task is actually still running
      checkTaskStatus().then(() => {
        // Only connect if still marked as running after status check
        if (activeSession.agentStatus === 'running') {
          connect();
        }
      });
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [activeSession.sessionId, activeSession.agentStatus, connect, checkTaskStatus]);

  // Consume buffered messages (clears the buffer)
  const consumeBufferedMessages = useCallback(() => {
    const messages = [...bufferedMessages];
    setBufferedMessages([]);
    return messages;
  }, [bufferedMessages]);

  return {
    bufferedMessages,
    isConnected,
    consumeBufferedMessages,
  };
}
