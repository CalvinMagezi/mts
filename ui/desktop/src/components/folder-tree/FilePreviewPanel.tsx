import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquarePlus, AlertTriangle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Check, Copy } from '../icons';
import { FileNode } from './types';
import { useFilePreview, getLanguageFromPath } from './useFilePreview';

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
}

export const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  file,
  onClose,
  onInsertToChat,
}) => {
  const { content, loading, error, truncated, totalLines, isImage, imagePath } = useFilePreview(file.path);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const language = getLanguageFromPath(file.path);

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex flex-col h-full bg-background-default rounded-lg border border-border-default overflow-hidden">
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
      {truncated && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 text-xs border-b border-border-default">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            File truncated. Showing first 1000 of {totalLines.toLocaleString()} lines.
          </span>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-text-muted">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-400">
            {error}
          </div>
        ) : isImage && imagePath ? (
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
        ) : content ? (
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
        ) : (
          <div className="flex items-center justify-center h-32 text-text-muted">
            Empty file
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
