import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

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
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize terminal once when mounted
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#4a4a4a',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in container
    terminal.open(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit after a short delay to ensure container has dimensions
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during initialization
      }
    });

    // Only create PTY if it hasn't been created yet
    if (!ptyAlreadyCreated) {
      window.electron.ptyCreate(terminalId, { cwd, shell }).then((result) => {
        if (result.error) {
          terminal.writeln(`\x1b[31mError: ${result.error}\x1b[0m`);
        } else {
          // Notify that PTY was created
          onPtyCreated?.();
          // Send initial resize after PTY is created
          setTimeout(() => {
            try {
              const dims = fitAddon.proposeDimensions();
              if (dims) {
                window.electron.ptyResize(terminalId, dims.cols, dims.rows);
              }
            } catch {
              // Ignore
            }
          }, 50);
        }
      });
    } else {
      // PTY already exists, just send a resize to sync dimensions
      setTimeout(() => {
        try {
          const dims = fitAddon.proposeDimensions();
          if (dims) {
            window.electron.ptyResize(terminalId, dims.cols, dims.rows);
          }
        } catch {
          // Ignore
        }
      }, 50);
    }

    // Handle user input - send to PTY
    const inputDisposable = terminal.onData((data) => {
      window.electron.ptyWrite(terminalId, data);
    });

    // Handle terminal resize - notify PTY
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      window.electron.ptyResize(terminalId, cols, rows);
    });

    // Handle title changes
    const titleDisposable = terminal.onTitleChange((title) => {
      onTitleChange?.(title);
    });

    // Listen for PTY data and write to terminal
    const handlePtyData = (id: string, data: string) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(data);
      }
    };

    const handlePtyExit = (id: string, exitCode: number) => {
      if (id === terminalId) {
        onExit?.(exitCode);
        terminalRef.current?.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`);
      }
    };

    window.electron.onPtyData(handlePtyData);
    window.electron.onPtyExit(handlePtyExit);

    // Focus terminal
    terminal.focus();

    // Cleanup on unmount - only dispose xterm, NOT the PTY
    return () => {
      inputDisposable.dispose();
      resizeDisposable.dispose();
      titleDisposable.dispose();
      window.electron.offPtyData();
      window.electron.offPtyExit();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]); // Only re-run if terminalId changes - other deps are intentionally excluded

  // Handle container resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch {
        // Ignore fit errors
      }
    }
  }, []);

  // Focus the terminal
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return {
    containerRef,
    handleResize,
    focus,
  };
};
