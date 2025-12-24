import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, MessageSquarePlus, AlertTriangle, Save, Edit, Eye } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor from '@monaco-editor/react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Check, Copy } from '../icons';
import { FileNode, OpenFile } from './types';
import { useFilePreview, getLanguageFromPath } from './useFilePreview';
import { FileTabBar } from './FileTabBar';

// Custom theme with better comment contrast (matching MarkdownContent)
const customOneDarkTheme = {
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    color: '#e6e6e6',
    fontSize: '13px',
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    color: '#e6e6e6',
    fontSize: '13px',
  },
  comment: { ...oneDark.comment, color: '#a0a0a0', fontStyle: 'italic' },
  prolog: { ...oneDark.prolog, color: '#a0a0a0' },
  doctype: { ...oneDark.doctype, color: '#a0a0a0' },
  cdata: { ...oneDark.cdata, color: '#a0a0a0' },
};

interface FilePreviewPanelProps {
  file: FileNode;
  onClose: () => void;
  onInsertToChat: (content: string, filePath: string) => void;
  // Editor props
  openFiles?: Map<string, OpenFile>;
  activeFilePath?: string | null;
  onSelectTab?: (filePath: string) => void;
  onCloseTab?: (filePath: string) => void;
  onSaveFile?: (filePath: string) => Promise<void>;
  onUpdateContent?: (filePath: string, content: string) => void;
  onEnterEditMode?: () => void;
}

export const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  file,
  onClose,
  onInsertToChat,
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onSaveFile,
  onUpdateContent,
  onEnterEditMode,
}) => {
  const { content, loading, error, truncated, totalLines, isImage, imagePath } = useFilePreview(
    file.path
  );
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const language = getLanguageFromPath(file.path);

  // Check if file is currently open in editor
  const activeFile = activeFilePath && openFiles ? openFiles.get(activeFilePath) : null;

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInsert = () => {
    if (content) {
      onInsertToChat(content, file.path);
    }
  };

  const handleToggleEditMode = () => {
    if (!isEditMode && onEnterEditMode) {
      // Entering edit mode
      onEnterEditMode();
      setIsEditMode(true);
    } else {
      // Exiting edit mode
      setIsEditMode(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (activeFilePath && onSaveFile) {
      await onSaveFile(activeFilePath);
    }
  }, [activeFilePath, onSaveFile]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFilePath && onUpdateContent) {
      onUpdateContent(activeFilePath, value);
    }
  };

  const handleTabClose = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCloseTab) {
      onCloseTab(filePath);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          onClose();
        }
      }
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isEditMode) {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl+W to close tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w' && isEditMode && activeFilePath) {
        e.preventDefault();
        if (onCloseTab) {
          onCloseTab(activeFilePath);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditMode, activeFilePath, onCloseTab, handleSave]);

  // Check file size for editing
  const checkFileSizeForEditing = (content: string): { canEdit: boolean; warning?: string; error?: string } => {
    const lines = content.split('\n').length;
    const sizeKB = new Blob([content]).size / 1024;

    if (lines > 10000 || sizeKB > 1024) {
      return {
        canEdit: false,
        error: 'File too large to edit. Please use an external editor.',
      };
    }

    if (lines > 5000 || sizeKB > 500) {
      return {
        canEdit: true,
        warning: 'Large file detected. Editing may be slow.',
      };
    }

    return { canEdit: true };
  };

  const fileSizeCheck = content ? checkFileSizeForEditing(content) : { canEdit: false };

  return (
    <div className="flex flex-col h-full bg-background-default rounded-lg border border-border-default overflow-hidden">
      {/* File Tabs */}
      {openFiles && openFiles.size > 0 && onSelectTab && (
        <FileTabBar
          openFiles={openFiles}
          activeFilePath={activeFilePath || null}
          onSelectTab={onSelectTab}
          onCloseTab={handleTabClose}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-background-medium/30">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </h3>
          <p className="text-xs text-text-muted truncate" title={file.path}>
            {file.path}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!isImage && (
            <>
              {/* View/Edit Toggle */}
              <Button
                variant={isEditMode ? 'ghost' : 'default'}
                size="sm"
                onClick={handleToggleEditMode}
                disabled={!content || !fileSizeCheck.canEdit}
                title={isEditMode ? 'View mode' : 'Edit mode'}
                className="h-8 px-3"
              >
                {isEditMode ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>

              {/* Save Button (only in edit mode) */}
              {isEditMode && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={!activeFile?.isDirty}
                  title="Save (Cmd+S)"
                  className="h-8 px-3"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              )}

              {/* Copy Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!content}
                title="Copy to clipboard"
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>

              {/* Insert to Chat Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInsert}
                disabled={!content}
                title="Insert into chat"
                className="h-8 w-8 p-0"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Close preview (Esc)"
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Truncation warning */}
      {truncated && !isEditMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 text-xs border-b border-border-default">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            File truncated. Showing first 1000 of {totalLines.toLocaleString()} lines.
          </span>
        </div>
      )}

      {/* File size warning/error */}
      {!isEditMode && content && fileSizeCheck.warning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 text-xs border-b border-border-default">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{fileSizeCheck.warning}</span>
        </div>
      )}
      {!isEditMode && content && fileSizeCheck.error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 text-xs border-b border-border-default">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{fileSizeCheck.error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-text-muted">Loading...</div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-400">{error}</div>
      ) : isImage && imagePath ? (
        <ScrollArea className="flex-1">
          <div className="flex items-center justify-center p-4 h-full">
            <img
              src={`file://${imagePath}`}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML =
                  '<span class="text-red-400">Failed to load image</span>';
              }}
            />
          </div>
        </ScrollArea>
      ) : isEditMode && activeFile ? (
        // Monaco Editor
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: false,
              automaticLayout: true,
            }}
          />
        </div>
      ) : content ? (
        // Syntax Highlighter (View Mode)
        <ScrollArea className="flex-1">
          <SyntaxHighlighter
            language={language}
            style={customOneDarkTheme}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              minHeight: '100%',
            }}
            showLineNumbers
            lineNumberStyle={{
              color: '#666',
              minWidth: '3em',
              paddingRight: '1em',
              userSelect: 'none',
            }}
          >
            {content}
          </SyntaxHighlighter>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center h-32 text-text-muted">Empty file</div>
      )}
    </div>
  );
};
