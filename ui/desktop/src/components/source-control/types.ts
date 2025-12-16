// Git file status characters from porcelain v2
export type GitFileStatus =
  | 'M' // Modified
  | 'A' // Added
  | 'D' // Deleted
  | 'R' // Renamed
  | 'C' // Copied
  | 'U' // Updated but unmerged
  | '?' // Untracked
  | '!'; // Ignored

export interface GitFile {
  path: string;
  oldPath?: string; // For renames
  status: GitFileStatus;
  staged: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  message: string;
  body?: string;
}

export interface CommitDetails extends GitCommit {
  files: GitCommitFile[];
  stats?: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
}

export interface GitCommitFile {
  path: string;
  status: GitFileStatus;
  additions?: number;
  deletions?: number;
}

export interface Branch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  upstream?: string;
}

export interface BranchesState {
  current: string | null;
  local: Branch[];
  remote: Branch[];
}

export interface GitStash {
  index: number;
  ref: string;
  message: string;
  date: string;
}

export interface RemoteStatus {
  ahead: number;
  behind: number;
  remote: string | null;
}

export interface GitRepoState {
  isRepo: boolean;
  rootPath: string | null;
  repoName: string | null;
  currentBranch: string | null;
  remoteStatus: RemoteStatus | null;
  lastFetched: Date | null;
}

export interface GitStatusResult {
  staged: GitFile[];
  unstaged: GitFile[];
  untracked: GitFile[];
}

export interface GitStatusState extends GitStatusResult {
  loading: boolean;
  error: string | null;
}

export interface CommitFormState {
  summary: string;
  description: string;
  isCommitting: boolean;
}

// IPC response types
export interface GitCommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ActiveTab = 'changes' | 'history';
