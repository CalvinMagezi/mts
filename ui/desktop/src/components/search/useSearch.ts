import { useState, useCallback, useEffect } from 'react';
import { SearchMatch } from './types';

interface UseSearchOptions {
  workingDir?: string;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<SearchMatch | null>(null);

  // Search options
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules,dist,build,out');
  const [contextLines, setContextLines] = useState(2);
  const [maxResults, setMaxResults] = useState(1000);

  // Working directory
  const [workingDir, setWorkingDir] = useState(
    options.workingDir || (window.appConfig.get('MTS_WORKING_DIR') as string) || ''
  );

  const search = useCallback(async () => {
    if (!query.trim() || !workingDir) {
      setResults([]);
      setTotalFiles(0);
      setTotalMatches(0);
      setTruncated(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const baseUrl = window.appConfig.get('BACKEND_URL') as string || '';
      const secretKey = await window.electron.getSecretKey();

      const response = await fetch(`${baseUrl}/search/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': secretKey,
        },
        body: JSON.stringify({
          query: query.trim(),
          workingDir,
          caseSensitive,
          useRegex,
          wholeWord,
          includePattern: includePattern || undefined,
          excludePattern: excludePattern || undefined,
          contextLines,
          maxResults,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.matches || []);
      setTotalFiles(data.totalFiles || 0);
      setTotalMatches(data.totalMatches || 0);
      setTruncated(data.truncated || false);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [
    query,
    workingDir,
    caseSensitive,
    useRegex,
    wholeWord,
    includePattern,
    excludePattern,
    contextLines,
    maxResults,
  ]);

  // Debounced auto-search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, caseSensitive, useRegex, wholeWord, includePattern, excludePattern, contextLines, search]);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotalFiles(0);
    setTotalMatches(0);
    setTruncated(false);
    setSelectedMatch(null);
  }, []);

  const selectFolder = useCallback(async () => {
    const result = await window.electron.directoryChooser();
    if (!result.canceled && result.filePaths[0]) {
      setWorkingDir(result.filePaths[0]);
    }
  }, []);

  return {
    // Search state
    query,
    setQuery,
    results,
    totalFiles,
    totalMatches,
    truncated,
    isSearching,
    error,
    selectedMatch,
    setSelectedMatch,

    // Search options
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
    contextLines,
    setContextLines,
    maxResults,
    setMaxResults,

    // Working directory
    workingDir,
    setWorkingDir,
    selectFolder,

    // Actions
    search,
    clearResults,
  };
};
