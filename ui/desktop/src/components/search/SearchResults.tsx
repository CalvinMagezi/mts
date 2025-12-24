import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { SearchMatch } from './types';
import { Button } from '../ui/button';

interface SearchResultsProps {
  results: SearchMatch[];
  totalFiles: number;
  totalMatches: number;
  truncated: boolean;
  error: string | null;
  query: string;
  selectedMatch: SearchMatch | null;
  setSelectedMatch: (match: SearchMatch | null) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  totalFiles,
  totalMatches,
  truncated,
  error,
  query,
  selectedMatch,
  setSelectedMatch,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Group results by file
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchMatch[]>();

    results.forEach((match) => {
      if (!groups.has(match.filePath)) {
        groups.set(match.filePath, []);
      }
      groups.get(match.filePath)!.push(match);
    });

    return Array.from(groups.entries()).map(([filePath, matches]) => ({
      filePath,
      matches,
      fileName: filePath.split('/').pop() || filePath,
    }));
  }, [results]);

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(groupedResults.map((g) => g.filePath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-500/40 text-text-default font-medium">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <AlertTriangle className="w-12 h-12 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p>Enter a search query to begin</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background-medium/30 rounded-lg border border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
        <div className="text-sm">
          <span className="text-text-default font-medium">
            {totalMatches.toLocaleString()}
          </span>
          <span className="text-text-muted"> results in </span>
          <span className="text-text-default font-medium">
            {totalFiles.toLocaleString()}
          </span>
          <span className="text-text-muted"> files</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <ChevronDown className="w-4 h-4 mr-1" />
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <ChevronRight className="w-4 h-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Truncated Warning */}
      {truncated && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 text-xs border-b border-border-default">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Results limited. Refine your search for more complete results.</span>
        </div>
      )}

      {/* Results List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {groupedResults.map(({ filePath, fileName, matches }) => {
            const isExpanded = expandedFiles.has(filePath);

            return (
              <div key={filePath} className="mb-2">
                {/* File Header */}
                <button
                  onClick={() => toggleFile(filePath)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-background-medium/50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-text-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-default truncate">
                      {fileName}
                    </div>
                    <div className="text-xs text-text-muted truncate">{filePath}</div>
                  </div>
                  <div className="text-xs text-text-muted bg-background-medium px-2 py-0.5 rounded">
                    {matches.length}
                  </div>
                </button>

                {/* Matches */}
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {matches.map((match, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedMatch(match)}
                        className={`
                          px-3 py-2 rounded-md cursor-pointer transition-colors font-mono text-xs
                          ${
                            selectedMatch === match
                              ? 'bg-mts-blue/20 border-l-2 border-mts-blue'
                              : 'hover:bg-background-medium/50'
                          }
                        `}
                      >
                        {/* Line number and matched line */}
                        <div className="flex items-start gap-2">
                          <span className="text-text-muted flex-shrink-0 w-12 text-right">
                            {match.lineNumber}
                          </span>
                          <div className="flex-1 min-w-0 overflow-x-auto">
                            <div className="whitespace-pre text-text-default">
                              {highlightMatch(match.lineText, query)}
                            </div>
                          </div>
                        </div>

                        {/* Context before */}
                        {match.contextBefore && match.contextBefore.length > 0 && (
                          <div className="mt-1 text-text-muted/70 space-y-0.5">
                            {match.contextBefore.map((line, i) => (
                              <div key={`before-${i}`} className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-12 text-right">
                                  {match.lineNumber - match.contextBefore.length + i}
                                </span>
                                <div className="flex-1 min-w-0 overflow-x-auto whitespace-pre">
                                  {line}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Context after */}
                        {match.contextAfter && match.contextAfter.length > 0 && (
                          <div className="mt-1 text-text-muted/70 space-y-0.5">
                            {match.contextAfter.map((line, i) => (
                              <div key={`after-${i}`} className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-12 text-right">
                                  {match.lineNumber + i + 1}
                                </span>
                                <div className="flex-1 min-w-0 overflow-x-auto whitespace-pre">
                                  {line}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
