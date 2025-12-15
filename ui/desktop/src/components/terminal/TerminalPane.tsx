import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { useTerminal } from './useTerminal';
import { useTerminalContext } from './TerminalContext';

interface TerminalPaneProps {
  terminalId: string;
  cwd?: string;
  shell?: string;
  onClose: () => void;
  isActive: boolean;
  onFocus: () => void;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  terminalId,
  cwd,
  shell,
  onClose,
  isActive,
  onFocus,
}) => {
  const { updateTerminalTitle, terminals, markPtyCreated } = useTerminalContext();
  const terminal = terminals.find((t) => t.id === terminalId);

  const { containerRef, handleResize, focus } = useTerminal({
    terminalId,
    cwd,
    shell,
    ptyAlreadyCreated: terminal?.ptyCreated ?? false,
    onPtyCreated: () => markPtyCreated(terminalId),
    onTitleChange: (title) => updateTerminalTitle(terminalId, title),
    onExit: (exitCode) => {
      console.log(`Terminal ${terminalId} exited with code ${exitCode}`);
    },
  });

  // Handle resize when pane size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [handleResize, containerRef]);

  // Auto-focus when becoming active
  useEffect(() => {
    if (isActive) {
      focus();
    }
  }, [isActive, focus]);

  return (
    <div
      className={`flex flex-col h-full bg-[#1a1a1a] rounded-lg overflow-hidden border ${isActive ? 'border-blue-500' : 'border-border-default'}`}
      onClick={onFocus}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-background-medium border-b border-border-default">
        <span className="text-sm text-text-default truncate">{terminal?.title || 'Terminal'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Terminal content */}
      <div ref={containerRef} className="flex-1 p-1" style={{ minHeight: 0 }} />
    </div>
  );
};
