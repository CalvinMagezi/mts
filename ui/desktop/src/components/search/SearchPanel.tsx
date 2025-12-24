import React, { useState } from 'react';
import { Search, FolderOpen, CaseSensitive, Regex, WholeWord, Replace } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ReplacePanel } from './ReplacePanel';

interface SearchPanelProps {
  query: string;
  setQuery: (query: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  wholeWord: boolean;
  setWholeWord: (value: boolean) => void;
  includePattern: string;
  setIncludePattern: (value: string) => void;
  excludePattern: string;
  setExcludePattern: (value: string) => void;
  workingDir: string;
  selectFolder: () => void;
  isSearching: boolean;
  totalMatches: number;
  totalFiles: number;
  results: Array<{ filePath: string }>;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  query,
  setQuery,
  caseSensitive,
  setCaseSensitive,
  useRegex,
  setUseRegex,
  wholeWord,
  setWholeWord,
  includePattern,
  setIncludePattern,
  excludePattern,
  setExcludePattern,
  workingDir,
  selectFolder,
  isSearching,
  totalMatches,
  totalFiles,
  results,
}) => {
  const [showReplace, setShowReplace] = useState(false);
  return (
    <div className="space-y-3 bg-background-medium/30 rounded-lg border border-border-default p-4">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Toggle Buttons */}
        <Button
          variant={caseSensitive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Case sensitive"
          className="px-3"
        >
          <CaseSensitive className="w-4 h-4" />
        </Button>

        <Button
          variant={useRegex ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseRegex(!useRegex)}
          title="Use regular expression"
          className="px-3"
        >
          <Regex className="w-4 h-4" />
        </Button>

        <Button
          variant={wholeWord ? 'default' : 'outline'}
          size="sm"
          onClick={() => setWholeWord(!wholeWord)}
          title="Match whole word"
          className="px-3"
        >
          <WholeWord className="w-4 h-4" />
        </Button>

        <Button
          variant={showReplace ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle replace"
          className="px-3"
        >
          <Replace className="w-4 h-4" />
        </Button>
      </div>

      {/* Working Directory */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-muted mb-1">Search in:</div>
          <div className="text-sm truncate" title={workingDir}>
            {workingDir || 'No folder selected'}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={selectFolder}>
          <FolderOpen className="w-4 h-4 mr-1.5" />
          Select Folder
        </Button>
      </div>

      {/* Include/Exclude Patterns */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-muted block mb-1">
            Files to include
          </label>
          <Input
            type="text"
            placeholder="e.g. *.ts,*.tsx"
            value={includePattern}
            onChange={(e) => setIncludePattern(e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">
            Files to exclude
          </label>
          <Input
            type="text"
            placeholder="e.g. node_modules,dist"
            value={excludePattern}
            onChange={(e) => setExcludePattern(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Status */}
      {isSearching && (
        <div className="text-sm text-text-muted">Searching...</div>
      )}

      {/* Replace Panel */}
      {showReplace && (
        <ReplacePanel
          query={query}
          workingDir={workingDir}
          caseSensitive={caseSensitive}
          useRegex={useRegex}
          wholeWord={wholeWord}
          includePattern={includePattern}
          excludePattern={excludePattern}
          totalMatches={totalMatches}
          totalFiles={totalFiles}
          results={results}
        />
      )}
    </div>
  );
};
