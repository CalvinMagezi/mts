export interface SearchMatch {
  filePath: string;
  lineNumber: number;
  column: number;
  lineText: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface SearchFilesResponse {
  matches: SearchMatch[];
  totalFiles: number;
  totalMatches: number;
  truncated: boolean;
}

export interface FilenameMatch {
  path: string;
  name: string;
}

export interface SearchFilenamesResponse {
  matches: FilenameMatch[];
  truncated: boolean;
}

export interface SearchState {
  query: string;
  results: SearchMatch[];
  totalFiles: number;
  totalMatches: number;
  truncated: boolean;
  isSearching: boolean;
  error: string | null;
  selectedMatch: SearchMatch | null;
}
