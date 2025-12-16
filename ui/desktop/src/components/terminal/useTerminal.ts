import { useEffect, useRef, useCallback } from 'react';
import '@xterm/xterm/css/xterm.css';
import { terminalInstanceManager } from './TerminalInstanceManager';

interface UseTerminalOptions {
  terminalId: string;
  cwd?: string;
  shell?: string;
  ptyAlreadyCreated: boolean; // Whether PTY was already created (from context)
  onPtyCreated?: () => void; // Callback when PTY is created
  onTitleChange?: (title: string) => void;
  onExit?: (exitCode: number) => void;
}

export const useTerminal = (options: UseTerminalOptions) => {
  const {
    terminalId,
    cwd,
    shell,
    ptyAlreadyCreated,
    onPtyCreated,
    onTitleChange,
    onExit,
  } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const disposablesRef = useRef<{ dispose: () => void }[]>([]);

  // Initialize terminal once when mounted
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get or create terminal instance from manager
    const instance = terminalInstanceManager.has(terminalId)
      ? terminalInstanceManager.get(terminalId)!
      : terminalInstanceManager.create(terminalId);

    const { terminal } = instance;

    // Attach terminal to container (handles both first-time and reattach)
    terminalInstanceManager.attach(terminalId, container);

    // Only create PTY if it hasn't been created yet
    if (!ptyAlreadyCreated) {
      window.electron.ptyCreate(terminalId, { cwd, shell }).then((result) => {
        if (result.error) {
          terminalInstanceManager.writeln(
            terminalId,
            `\x1b[31mError: ${result.error}\x1b[0m`
          );
        } else {
          // Notify that PTY was created
          onPtyCreated?.();
          // Send initial resize after PTY is created
          setTimeout(() => {
            const dims = terminalInstanceManager.proposeDimensions(terminalId);
            if (dims) {
              window.electron.ptyResize(terminalId, dims.cols, dims.rows);
            }
          }, 50);
        }
      });
    } else {
      // PTY already exists, just send a resize to sync dimensions
      setTimeout(() => {
        const dims = terminalInstanceManager.proposeDimensions(terminalId);
        if (dims) {
          window.electron.ptyResize(terminalId, dims.cols, dims.rows);
        }
      }, 50);
    }

    // Handle user input - send to PTY and scroll to bottom
    const inputDisposable = terminal.onData((data) => {
      window.electron.ptyWrite(terminalId, data);
      terminal.scrollToBottom();
    });
    disposablesRef.current.push(inputDisposable);

    // Handle terminal resize - notify PTY
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      window.electron.ptyResize(terminalId, cols, rows);
    });
    disposablesRef.current.push(resizeDisposable);

    // Handle title changes
    const titleDisposable = terminal.onTitleChange((title) => {
      onTitleChange?.(title);
    });
    disposablesRef.current.push(titleDisposable);

    // Listen for PTY data and write to terminal
    const handlePtyData = (id: string, data: string) => {
      if (id === terminalId) {
        terminalInstanceManager.write(terminalId, data);
      }
    };

    const handlePtyExit = (id: string, exitCode: number) => {
      if (id === terminalId) {
        onExit?.(exitCode);
        terminalInstanceManager.writeln(
          terminalId,
          `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`
        );
      }
    };

    window.electron.onPtyData(handlePtyData);
    window.electron.onPtyExit(handlePtyExit);

    // Focus terminal
    terminalInstanceManager.focus(terminalId);

    // Cleanup on unmount - detach but DON'T destroy (keeps buffer intact)
    return () => {
      // Dispose event listeners
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];

      // Remove IPC listeners
      window.electron.offPtyData();
      window.electron.offPtyExit();

      // Detach from DOM but keep instance alive for reattachment
      terminalInstanceManager.detach(terminalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]); // Only re-run if terminalId changes - other deps are intentionally excluded

  // Handle container resize
  const handleResize = useCallback(() => {
    terminalInstanceManager.fit(terminalId);
  }, [terminalId]);

  // Focus the terminal
  const focus = useCallback(() => {
    terminalInstanceManager.focus(terminalId);
  }, [terminalId]);

  return {
    containerRef,
    handleResize,
    focus,
  };
};
