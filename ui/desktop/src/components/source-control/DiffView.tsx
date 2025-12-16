import React from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { GitFile } from './types';

interface DiffViewProps {
  file: GitFile | null;
  diffContent: string;
  isLoading: boolean;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function parseDiff(diff: string): DiffLine[] {
  if (!diff) return [];

  const lines = diff.split('\n');
  const result: DiffLine[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('@@')) {
      // Parse hunk header: @@ -start,count +start,count @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10) - 1;
        newLine = parseInt(match[2], 10) - 1;
      }
      result.push({ type: 'hunk', content: line });
    } else if (line.startsWith('+')) {
      newLine++;
      result.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLine,
      });
    } else if (line.startsWith('-')) {
      oldLine++;
      result.push({
        type: 'remove',
        content: line.slice(1),
        oldLineNumber: oldLine,
      });
    } else if (line.startsWith(' ') || line === '') {
      oldLine++;
      newLine++;
      result.push({
        type: 'context',
        content: line.slice(1) || '',
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      });
    }
  }

  return result;
}

export const DiffView: React.FC<DiffViewProps> = ({ file, diffContent, isLoading }) => {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Select a file to view its changes
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Loading diff...
      </div>
    );
  }

  if (!diffContent) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        {file.status === '?' ? 'New file (untracked)' : 'No changes to display'}
      </div>
    );
  }

  const diffLines = parseDiff(diffContent);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border-default bg-background-muted">
        <span className="text-sm font-medium">{file.path}</span>
        {file.oldPath && (
          <span className="text-xs text-text-muted ml-2">(renamed from {file.oldPath})</span>
        )}
      </div>

      {/* Diff Content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-sm">
          {diffLines.map((line, index) => (
            <DiffLineComponent key={index} line={line} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const DiffLineComponent: React.FC<{ line: DiffLine }> = ({ line }) => {
  const getLineStyle = () => {
    switch (line.type) {
      case 'add':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'remove':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'hunk':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'header':
        return 'bg-background-muted text-text-muted';
      default:
        return '';
    }
  };

  const getPrefix = () => {
    switch (line.type) {
      case 'add':
        return '+';
      case 'remove':
        return '-';
      default:
        return ' ';
    }
  };

  return (
    <div className={`flex ${getLineStyle()}`}>
      {/* Line Numbers */}
      {(line.type === 'add' || line.type === 'remove' || line.type === 'context') && (
        <>
          <span className="w-12 text-right pr-2 text-text-muted select-none border-r border-border-default bg-background-muted/50">
            {line.type !== 'add' ? line.oldLineNumber || '' : ''}
          </span>
          <span className="w-12 text-right pr-2 text-text-muted select-none border-r border-border-default bg-background-muted/50">
            {line.type !== 'remove' ? line.newLineNumber || '' : ''}
          </span>
        </>
      )}

      {/* Prefix */}
      {(line.type === 'add' || line.type === 'remove' || line.type === 'context') && (
        <span className="w-6 text-center select-none">{getPrefix()}</span>
      )}

      {/* Content */}
      <pre className="flex-1 px-2 whitespace-pre-wrap break-all">{line.content}</pre>
    </div>
  );
};

export default DiffView;
