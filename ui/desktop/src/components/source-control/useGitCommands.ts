import { useCallback } from 'react';
import {
  GitFile,
  GitCommit,
  Branch,
  GitStash,
  GitStatusResult,
  BranchesState,
  RemoteStatus,
  GitCommandResult,
} from './types';

export interface UseGitCommandsResult {
  // Repository info
  isRepo: () => Promise<boolean>;
  getRepoRoot: () => Promise<string | null>;
  getCurrentBranch: () => Promise<string | null>;

  // Status and diff
  getStatus: () => Promise<GitStatusResult & { error?: string }>;
  getDiff: (filePath?: string, staged?: boolean) => Promise<string>;

  // History
  getLog: (limit?: number, skip?: number) => Promise<GitCommit[]>;
  showCommit: (hash: string) => Promise<{
    hash: string;
    shortHash: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
    body?: string;
    stats: string;
  } | null>;

  // Branches
  getBranches: () => Promise<BranchesState>;
  createBranch: (name: string, checkout?: boolean) => Promise<GitCommandResult>;
  checkoutBranch: (name: string) => Promise<GitCommandResult>;
  deleteBranch: (name: string, force?: boolean) => Promise<GitCommandResult>;

  // Staging
  stage: (paths: string[]) => Promise<GitCommandResult>;
  unstage: (paths: string[]) => Promise<GitCommandResult>;
  discard: (paths: string[]) => Promise<GitCommandResult>;

  // Commits
  commit: (message: string, description?: string) => Promise<GitCommandResult>;

  // Remote operations
  fetch: () => Promise<GitCommandResult>;
  pull: () => Promise<GitCommandResult>;
  push: (force?: boolean) => Promise<GitCommandResult>;
  getRemoteStatus: () => Promise<RemoteStatus>;

  // Stash
  getStashList: () => Promise<GitStash[]>;
  stashSave: (message?: string) => Promise<GitCommandResult>;
  stashPop: (index?: number) => Promise<GitCommandResult>;
  stashDrop: (index: number) => Promise<GitCommandResult>;
}

export function useGitCommands(cwd: string): UseGitCommandsResult {
  // Repository info
  const isRepo = useCallback(async (): Promise<boolean> => {
    return window.electron.gitIsRepo(cwd);
  }, [cwd]);

  const getRepoRoot = useCallback(async (): Promise<string | null> => {
    return window.electron.gitRepoRoot(cwd);
  }, [cwd]);

  const getCurrentBranch = useCallback(async (): Promise<string | null> => {
    return window.electron.gitCurrentBranch(cwd);
  }, [cwd]);

  // Status and diff
  const getStatus = useCallback(async (): Promise<GitStatusResult & { error?: string }> => {
    const result = await window.electron.gitStatus(cwd);
    return {
      staged: result.staged as GitFile[],
      unstaged: result.unstaged as GitFile[],
      untracked: result.untracked as GitFile[],
      error: result.error,
    };
  }, [cwd]);

  const getDiff = useCallback(
    async (filePath?: string, staged?: boolean): Promise<string> => {
      return window.electron.gitDiff(cwd, filePath, staged);
    },
    [cwd]
  );

  // History
  const getLog = useCallback(
    async (limit = 50, skip = 0): Promise<GitCommit[]> => {
      return window.electron.gitLog(cwd, limit, skip) as Promise<GitCommit[]>;
    },
    [cwd]
  );

  const showCommit = useCallback(
    async (hash: string) => {
      return window.electron.gitShowCommit(cwd, hash);
    },
    [cwd]
  );

  // Branches
  const getBranches = useCallback(async (): Promise<BranchesState> => {
    const result = await window.electron.gitBranches(cwd);
    return {
      current: result.current,
      local: result.local as Branch[],
      remote: result.remote as Branch[],
    };
  }, [cwd]);

  const createBranch = useCallback(
    async (name: string, checkout = true): Promise<GitCommandResult> => {
      const result = await window.electron.gitBranchCreate(cwd, name, checkout);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const checkoutBranch = useCallback(
    async (name: string): Promise<GitCommandResult> => {
      const result = await window.electron.gitBranchCheckout(cwd, name);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const deleteBranch = useCallback(
    async (name: string, force = false): Promise<GitCommandResult> => {
      const result = await window.electron.gitBranchDelete(cwd, name, force);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  // Staging
  const stage = useCallback(
    async (paths: string[]): Promise<GitCommandResult> => {
      const result = await window.electron.gitStage(cwd, paths);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const unstage = useCallback(
    async (paths: string[]): Promise<GitCommandResult> => {
      const result = await window.electron.gitUnstage(cwd, paths);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const discard = useCallback(
    async (paths: string[]): Promise<GitCommandResult> => {
      const result = await window.electron.gitDiscard(cwd, paths);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  // Commits
  const commit = useCallback(
    async (message: string, description?: string): Promise<GitCommandResult> => {
      const result = await window.electron.gitCommit(cwd, message, description);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  // Remote operations
  const fetch = useCallback(async (): Promise<GitCommandResult> => {
    const result = await window.electron.gitFetch(cwd);
    return { success: result.success, error: result.error };
  }, [cwd]);

  const pull = useCallback(async (): Promise<GitCommandResult> => {
    const result = await window.electron.gitPull(cwd);
    return { success: result.success, error: result.error };
  }, [cwd]);

  const push = useCallback(
    async (force = false): Promise<GitCommandResult> => {
      const result = await window.electron.gitPush(cwd, force);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const getRemoteStatus = useCallback(async (): Promise<RemoteStatus> => {
    return window.electron.gitRemoteStatus(cwd);
  }, [cwd]);

  // Stash
  const getStashList = useCallback(async (): Promise<GitStash[]> => {
    return window.electron.gitStashList(cwd) as Promise<GitStash[]>;
  }, [cwd]);

  const stashSave = useCallback(
    async (message?: string): Promise<GitCommandResult> => {
      const result = await window.electron.gitStashSave(cwd, message);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const stashPop = useCallback(
    async (index?: number): Promise<GitCommandResult> => {
      const result = await window.electron.gitStashPop(cwd, index);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  const stashDrop = useCallback(
    async (index: number): Promise<GitCommandResult> => {
      const result = await window.electron.gitStashDrop(cwd, index);
      return { success: result.success, error: result.error };
    },
    [cwd]
  );

  return {
    isRepo,
    getRepoRoot,
    getCurrentBranch,
    getStatus,
    getDiff,
    getLog,
    showCommit,
    getBranches,
    createBranch,
    checkoutBranch,
    deleteBranch,
    stage,
    unstage,
    discard,
    commit,
    fetch,
    pull,
    push,
    getRemoteStatus,
    getStashList,
    stashSave,
    stashPop,
    stashDrop,
  };
}
