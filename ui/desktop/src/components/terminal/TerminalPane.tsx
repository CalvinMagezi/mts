import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Check,
  XCircle,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
  Copy,
  ClipboardPaste,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTerminal } from './useTerminal';
import { useTerminalContext } from './TerminalContext';
import { terminalInstanceManager } from './TerminalInstanceManager';

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
  const { updateTerminalTitle, terminals, markPtyCreated, setExitCode } = useTerminalContext();
  const terminal = terminals.find((t) => t.id === terminalId);

  const { containerRef, handleResize, focus } = useTerminal({
    terminalId,
    cwd,
    shell,
    ptyAlreadyCreated: terminal?.ptyCreated ?? false,
    onPtyCreated: () => markPtyCreated(terminalId),
    onTitleChange: (title) => updateTerminalTitle(terminalId, title),
    onExit: (exitCode) => {
      setExitCode(terminalId, exitCode);
    },
  });

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleFindNext = useCallback(() => {
    if (searchTerm) {
      terminalInstanceManager.findNext(terminalId, searchTerm);
    }
  }, [terminalId, searchTerm]);

  const handleFindPrevious = useCallback(() => {
    if (searchTerm) {
      terminalInstanceManager.findPrevious(terminalId, searchTerm);
    }
  }, [terminalId, searchTerm]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchTerm('');
    terminalInstanceManager.clearSearch(terminalId);
    focus();
  }, [terminalId, focus]);

  // Handle Cmd+F to open search (when this pane is active)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Handle search input keydown (Enter for next, Shift+Enter for previous, Escape to close)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  };

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Context menu actions
  const handleCopy = async () => {
    const selection = terminalInstanceManager.getSelection(terminalId);
    if (selection) {
      await navigator.clipboard.writeText(selection);
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    if (text) {
      window.electron.ptyWrite(terminalId, text);
    }
    setContextMenu(null);
  };

  const handleClear = () => {
    terminalInstanceManager.clear(terminalId);
    setContextMenu(null);
  };

  // Rename handlers
  const startRename = () => {
    setRenameValue(terminal?.title || '');
    setIsRenaming(true);
    setContextMenu(null);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const confirmRename = () => {
    if (renameValue.trim()) {
      updateTerminalTitle(terminalId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  // Render exit status badge
  const renderStatusBadge = () => {
    if (terminal?.exitCode === undefined) {
      // Still running
      return (
        <span className="flex items-center gap-1 text-xs text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
        </span>
      );
    } else if (terminal.exitCode === 0) {
      // Exited successfully
      return (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <Check className="w-3 h-3" />
        </span>
      );
    } else {
      // Exited with error
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <XCircle className="w-3 h-3" />
          <span>{terminal.exitCode}</span>
        </span>
      );
    }
  };

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
      onContextMenu={handleContextMenu}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-background-medium border-b border-border-default">
        <div className="flex items-center gap-2 min-w-0">
          {renderStatusBadge()}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={confirmRename}
              className="text-sm text-text-default bg-transparent border border-blue-500 rounded px-1 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm text-text-default truncate cursor-pointer hover:text-blue-400"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
              title="Double-click to rename"
            >
              {terminal?.title || 'Terminal'}
            </span>
          )}
        </div>
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

      {/* Search overlay */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-default border-b border-border-default">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) {
                terminalInstanceManager.findNext(terminalId, e.target.value);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-text-default placeholder-text-muted outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleFindPrevious();
            }}
            className="h-6 w-6 p-0"
            title="Previous (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleFindNext();
            }}
            className="h-6 w-6 p-0"
            title="Next (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              closeSearch();
            }}
            className="h-6 w-6 p-0"
            title="Close (Escape)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Terminal content */}
      <div ref={containerRef} className="flex-1 p-1" style={{ minHeight: 0 }} />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-background-default border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left text-text-default hover:bg-background-medium flex items-center gap-2"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left text-text-default hover:bg-background-medium flex items-center gap-2"
            onClick={handlePaste}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste
          </button>
          <div className="border-t border-border-default my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left text-text-default hover:bg-background-medium flex items-center gap-2"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left text-text-default hover:bg-background-medium flex items-center gap-2"
            onClick={startRename}
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <div className="border-t border-border-default my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              onClose();
            }}
          >
            <X className="w-4 h-4" />
            Close Terminal
          </button>
        </div>
      )}
    </div>
  );
};
