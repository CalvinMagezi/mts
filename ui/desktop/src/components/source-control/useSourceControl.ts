import { useState, useCallback, useEffect, useRef } from 'react';
import { useGitCommands } from './useGitCommands';
import { generateCommitMessage as generateCommitMessageApi } from '../../api';
import {
  GitFile,
  GitCommit,
  GitStash,
  GitRepoState,
  GitStatusState,
  BranchesState,
  ActiveTab,
} from './types';

export interface UseSourceControlResult {
  // Working directory
  workingDir: string;
  setWorkingDir: (dir: string) => void;

  // Repository state
  repoState: GitRepoState;

  // Status state
  statusState: GitStatusState;

  // Branches
  branches: BranchesState;

  // History
  commits: GitCommit[];
  loadMoreCommits: () => Promise<void>;
  hasMoreCommits: boolean;

  // Stashes
  stashes: GitStash[];

  // Selection state
  selectedFile: GitFile | null;
  setSelectedFile: (file: GitFile | null) => void;
  selectedCommit: GitCommit | null;
  setSelectedCommit: (commit: GitCommit | null) => void;

  // Diff content
  diffContent: string;
  diffLoading: boolean;

  // Active tab
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Commit form
  commitSummary: string;
  setCommitSummary: (summary: string) => void;
  commitDescription: string;
  setCommitDescription: (description: string) => void;
  isCommitting: boolean;
  isGeneratingCommitMessage: boolean;
  generateCommitMessage: () => Promise<void>;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isPulling: boolean;
  isPushing: boolean;

  // Actions
  refresh: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  discardFiles: (paths: string[]) => Promise<void>;
  commit: () => Promise<boolean>;
  fetch: () => Promise<void>;
  pull: () => Promise<void>;
  push: (force?: boolean) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  createBranch: (name: string, checkout?: boolean) => Promise<void>;
  deleteBranch: (name: string, force?: boolean) => Promise<void>;
  stashSave: (message?: string) => Promise<void>;
  stashPop: (index?: number) => Promise<void>;
  stashDrop: (index: number) => Promise<void>;

  // Error state
  error: string | null;
  clearError: () => void;
}

export interface UseSourceControlOptions {
  initialPath?: string;
  getProviderAndModel?: () => Promise<{ provider: string; model: string }>;
}

export function useSourceControl(options: UseSourceControlOptions = {}): UseSourceControlResult {
  const { initialPath, getProviderAndModel } = options;
  const [workingDir, setWorkingDir] = useState<string>(
    initialPath || (window.appConfig.get('MTS_WORKING_DIR') as string) || ''
  );

  const git = useGitCommands(workingDir);
  const commitsSkipRef = useRef(0);
  const hasMoreCommitsRef = useRef(true);

  // Repository state
  const [repoState, setRepoState] = useState<GitRepoState>({
    isRepo: false,
    rootPath: null,
    repoName: null,
    currentBranch: null,
    remoteStatus: null,
    lastFetched: null,
  });

  // Status state
  const [statusState, setStatusState] = useState<GitStatusState>({
    staged: [],
    unstaged: [],
    untracked: [],
    loading: false,
    error: null,
  });

  // Branches
  const [branches, setBranches] = useState<BranchesState>({
    current: null,
    local: [],
    remote: [],
  });

  // History
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [hasMoreCommits, setHasMoreCommits] = useState(true);

  // Stashes
  const [stashes, setStashes] = useState<GitStash[]>([]);

  // Selection
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);

  // Diff
  const [diffContent, setDiffContent] = useState<string>('');
  const [diffLoading, setDiffLoading] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('changes');

  // Commit form
  const [commitSummary, setCommitSummary] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGeneratingCommitMessage, setIsGeneratingCommitMessage] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Load repository info
  const loadRepoInfo = useCallback(async () => {
    const isRepo = await git.isRepo();
    if (!isRepo) {
      setRepoState({
        isRepo: false,
        rootPath: null,
        repoName: null,
        currentBranch: null,
        remoteStatus: null,
        lastFetched: null,
      });
      return false;
    }

    const [rootPath, currentBranch, remoteStatus] = await Promise.all([
      git.getRepoRoot(),
      git.getCurrentBranch(),
      git.getRemoteStatus(),
    ]);

    const repoName = rootPath ? rootPath.split('/').pop() || rootPath : null;

    setRepoState((prev) => ({
      isRepo: true,
      rootPath,
      repoName,
      currentBranch,
      remoteStatus,
      lastFetched: prev.lastFetched,
    }));

    return true;
  }, [git]);

  // Load status
  const loadStatus = useCallback(async () => {
    setStatusState((prev) => ({ ...prev, loading: true, error: null }));

    const result = await git.getStatus();

    setStatusState({
      staged: result.staged,
      unstaged: result.unstaged,
      untracked: result.untracked,
      loading: false,
      error: result.error || null,
    });
  }, [git]);

  // Load branches
  const loadBranches = useCallback(async () => {
    const result = await git.getBranches();
    setBranches(result);
  }, [git]);

  // Load commits
  const loadCommits = useCallback(
    async (reset = true) => {
      if (reset) {
        commitsSkipRef.current = 0;
        hasMoreCommitsRef.current = true;
      }

      const limit = 50;
      const result = await git.getLog(limit, commitsSkipRef.current);

      if (result.length < limit) {
        hasMoreCommitsRef.current = false;
        setHasMoreCommits(false);
      }

      if (reset) {
        setCommits(result);
      } else {
        setCommits((prev) => [...prev, ...result]);
      }

      commitsSkipRef.current += result.length;
    },
    [git]
  );

  const loadMoreCommits = useCallback(async () => {
    if (!hasMoreCommitsRef.current) return;
    await loadCommits(false);
  }, [loadCommits]);

  // Load stashes
  const loadStashes = useCallback(async () => {
    const result = await git.getStashList();
    setStashes(result);
  }, [git]);

  // Full refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const isRepo = await loadRepoInfo();
      if (!isRepo) {
        setIsLoading(false);
        return;
      }

      await Promise.all([loadStatus(), loadBranches(), loadCommits(true), loadStashes()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
    } finally {
      setIsLoading(false);
    }
  }, [loadRepoInfo, loadStatus, loadBranches, loadCommits, loadStashes]);

  // Stage files
  const stageFiles = useCallback(
    async (paths: string[]) => {
      const result = await git.stage(paths);
      if (!result.success) {
        setError(result.error || 'Failed to stage files');
        return;
      }
      await loadStatus();
    },
    [git, loadStatus]
  );

  // Unstage files
  const unstageFiles = useCallback(
    async (paths: string[]) => {
      const result = await git.unstage(paths);
      if (!result.success) {
        setError(result.error || 'Failed to unstage files');
        return;
      }
      await loadStatus();
    },
    [git, loadStatus]
  );

  // Stage all
  const stageAll = useCallback(async () => {
    const allPaths = [
      ...statusState.unstaged.map((f) => f.path),
      ...statusState.untracked.map((f) => f.path),
    ];
    if (allPaths.length > 0) {
      await stageFiles(allPaths);
    }
  }, [statusState.unstaged, statusState.untracked, stageFiles]);

  // Unstage all
  const unstageAll = useCallback(async () => {
    const allPaths = statusState.staged.map((f) => f.path);
    if (allPaths.length > 0) {
      await unstageFiles(allPaths);
    }
  }, [statusState.staged, unstageFiles]);

  // Discard files
  const discardFiles = useCallback(
    async (paths: string[]) => {
      const result = await git.discard(paths);
      if (!result.success) {
        setError(result.error || 'Failed to discard changes');
        return;
      }
      await loadStatus();
    },
    [git, loadStatus]
  );

  // Commit
  const commit = useCallback(async (): Promise<boolean> => {
    if (!commitSummary.trim()) {
      setError('Commit message is required');
      return false;
    }

    if (statusState.staged.length === 0) {
      setError('No staged changes to commit');
      return false;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const result = await git.commit(commitSummary, commitDescription || undefined);
      if (!result.success) {
        setError(result.error || 'Failed to create commit');
        return false;
      }

      // Clear form and refresh
      setCommitSummary('');
      setCommitDescription('');
      await Promise.all([loadStatus(), loadCommits(true), loadRepoInfo()]);
      return true;
    } finally {
      setIsCommitting(false);
    }
  }, [commitSummary, commitDescription, statusState.staged, git, loadStatus, loadCommits, loadRepoInfo]);

  // Generate commit message with AI
  const generateCommitMessage = useCallback(async () => {
    const totalChanges =
      statusState.staged.length + statusState.unstaged.length + statusState.untracked.length;

    if (totalChanges === 0) {
      setError('No changes to generate commit message for');
      return;
    }

    if (!getProviderAndModel) {
      setError('AI provider not configured');
      return;
    }

    setIsGeneratingCommitMessage(true);
    setError(null);

    try {
      // Use staged diff if there are staged changes, otherwise use unstaged diff
      const hasStaged = statusState.staged.length > 0;
      const diff = await window.electron.gitDiff(workingDir, undefined, hasStaged);

      if (!diff || diff.trim() === '') {
        setError('No changes found');
        return;
      }

      // Get current provider and model
      const { provider, model } = await getProviderAndModel();

      const response = await generateCommitMessageApi({
        body: {
          diff,
          provider,
          model,
        },
      });

      if (response.data) {
        setCommitSummary(response.data.summary);
        setCommitDescription(response.data.description);
      } else if (response.error) {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : 'Failed to generate commit message';
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate commit message');
    } finally {
      setIsGeneratingCommitMessage(false);
    }
  }, [workingDir, statusState.staged, statusState.unstaged, statusState.untracked, getProviderAndModel]);

  // Fetch
  const fetch = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      const result = await git.fetch();
      if (!result.success) {
        setError(result.error || 'Failed to fetch');
        return;
      }

      setRepoState((prev) => ({ ...prev, lastFetched: new Date() }));
      await loadRepoInfo();
    } finally {
      setIsFetching(false);
    }
  }, [git, loadRepoInfo]);

  // Pull
  const pull = useCallback(async () => {
    setIsPulling(true);
    setError(null);

    try {
      const result = await git.pull();
      if (!result.success) {
        setError(result.error || 'Failed to pull');
        return;
      }

      await refresh();
    } finally {
      setIsPulling(false);
    }
  }, [git, refresh]);

  // Push
  const push = useCallback(
    async (force = false) => {
      setIsPushing(true);
      setError(null);

      try {
        const result = await git.push(force);
        if (!result.success) {
          setError(result.error || 'Failed to push');
          return;
        }

        await loadRepoInfo();
      } finally {
        setIsPushing(false);
      }
    },
    [git, loadRepoInfo]
  );

  // Checkout branch
  const checkoutBranch = useCallback(
    async (name: string) => {
      setError(null);

      const result = await git.checkoutBranch(name);
      if (!result.success) {
        setError(result.error || 'Failed to checkout branch');
        return;
      }

      await refresh();
    },
    [git, refresh]
  );

  // Create branch
  const createBranch = useCallback(
    async (name: string, checkout = true) => {
      setError(null);

      const result = await git.createBranch(name, checkout);
      if (!result.success) {
        setError(result.error || 'Failed to create branch');
        return;
      }

      await refresh();
    },
    [git, refresh]
  );

  // Delete branch
  const deleteBranch = useCallback(
    async (name: string, force = false) => {
      setError(null);

      const result = await git.deleteBranch(name, force);
      if (!result.success) {
        setError(result.error || 'Failed to delete branch');
        return;
      }

      await loadBranches();
    },
    [git, loadBranches]
  );

  // Stash save
  const stashSave = useCallback(
    async (message?: string) => {
      setError(null);

      const result = await git.stashSave(message);
      if (!result.success) {
        setError(result.error || 'Failed to save stash');
        return;
      }

      await Promise.all([loadStatus(), loadStashes()]);
    },
    [git, loadStatus, loadStashes]
  );

  // Stash pop
  const stashPop = useCallback(
    async (index?: number) => {
      setError(null);

      const result = await git.stashPop(index);
      if (!result.success) {
        setError(result.error || 'Failed to pop stash');
        return;
      }

      await Promise.all([loadStatus(), loadStashes()]);
    },
    [git, loadStatus, loadStashes]
  );

  // Stash drop
  const stashDrop = useCallback(
    async (index: number) => {
      setError(null);

      const result = await git.stashDrop(index);
      if (!result.success) {
        setError(result.error || 'Failed to drop stash');
        return;
      }

      await loadStashes();
    },
    [git, loadStashes]
  );

  // Load diff when file selected
  useEffect(() => {
    if (!selectedFile) {
      setDiffContent('');
      setDiffLoading(false);
      return;
    }

    let cancelled = false;
    setDiffLoading(true);

    const loadDiff = async () => {
      try {
        // Call window.electron.gitDiff directly to avoid unstable hook reference
        const diff = await window.electron.gitDiff(
          workingDir,
          selectedFile.path,
          selectedFile.staged
        );
        if (!cancelled) {
          setDiffContent(diff || '');
          setDiffLoading(false);
        }
      } catch (error) {
        console.error('Failed to load diff:', error);
        if (!cancelled) {
          setDiffContent('');
          setDiffLoading(false);
          setError(`Failed to load diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    loadDiff();

    return () => {
      cancelled = true;
    };
  }, [selectedFile, workingDir]);

  // Initial load
  useEffect(() => {
    if (workingDir) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingDir]); // Only run when workingDir changes, not on every refresh update

  return {
    workingDir,
    setWorkingDir,
    repoState,
    statusState,
    branches,
    commits,
    loadMoreCommits,
    hasMoreCommits,
    stashes,
    selectedFile,
    setSelectedFile,
    selectedCommit,
    setSelectedCommit,
    diffContent,
    diffLoading,
    activeTab,
    setActiveTab,
    commitSummary,
    setCommitSummary,
    commitDescription,
    setCommitDescription,
    isCommitting,
    isGeneratingCommitMessage,
    generateCommitMessage,
    isLoading,
    isFetching,
    isPulling,
    isPushing,
    refresh,
    stageFiles,
    unstageFiles,
    stageAll,
    unstageAll,
    discardFiles,
    commit,
    fetch,
    pull,
    push,
    checkoutBranch,
    createBranch,
    deleteBranch,
    stashSave,
    stashPop,
    stashDrop,
    error,
    clearError,
  };
}
