import Electron, { contextBridge, ipcRenderer, webUtils } from 'electron';
import { Recipe } from './recipe';

interface NotificationData {
  title: string;
  body: string;
}

interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  title?: string;
  message: string;
  detail?: string;
}

interface MessageBoxResponse {
  response: number;
  checkboxChecked?: boolean;
}

interface FileResponse {
  file: string;
  filePath: string;
  error: string | null;
  found: boolean;
}

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface SaveDataUrlResponse {
  id: string;
  filePath?: string;
  error?: string;
}

const config = JSON.parse(process.argv.find((arg) => arg.startsWith('{')) || '{}');

interface UpdaterEvent {
  event: string;
  data?: unknown;
}

// Define the API types in a single place
type ElectronAPI = {
  platform: string;
  reactReady: () => void;
  getConfig: () => Record<string, unknown>;
  hideWindow: () => void;
  directoryChooser: (replace?: boolean) => Promise<Electron.OpenDialogReturnValue>;
  createChatWindow: (
    query?: string,
    dir?: string,
    version?: string,
    resumeSessionId?: string,
    viewType?: string,
    recipeId?: string
  ) => void;
  logInfo: (txt: string) => void;
  showNotification: (data: NotificationData) => void;
  showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResponse>;
  openInChrome: (url: string) => void;
  fetchMetadata: (url: string) => Promise<string>;
  reloadApp: () => void;
  checkForOllama: () => Promise<boolean>;
  selectFileOrDirectory: (defaultPath?: string) => Promise<string | null>;
  getBinaryPath: (binaryName: string) => Promise<string>;
  readFile: (directory: string) => Promise<FileResponse>;
  writeFile: (directory: string, content: string) => Promise<boolean>;
  ensureDirectory: (dirPath: string) => Promise<boolean>;
  listFiles: (dirPath: string, extension?: string) => Promise<string[]>;
  readDirectoryTree: (dirPath: string, maxDepth?: number) => Promise<FileNode[]>;
  getAllowedExtensions: () => Promise<string[]>;
  getPathForFile: (file: File) => string;
  setMenuBarIcon: (show: boolean) => Promise<boolean>;
  getMenuBarIconState: () => Promise<boolean>;
  setDockIcon: (show: boolean) => Promise<boolean>;
  getDockIconState: () => Promise<boolean>;
  getSettings: () => Promise<unknown | null>;
  getSecretKey: () => Promise<string>;
  getMTSdHostPort: () => Promise<string | null>;
  setWakelock: (enable: boolean) => Promise<boolean>;
  getWakelockState: () => Promise<boolean>;
  openNotificationsSettings: () => Promise<boolean>;
  onMouseBackButtonClicked: (callback: () => void) => void;
  offMouseBackButtonClicked: (callback: () => void) => void;
  on: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  off: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  emit: (channel: string, ...args: unknown[]) => void;
  broadcastThemeChange: (themeData: {
    mode: string;
    useSystemTheme: boolean;
    theme: string;
  }) => void;
  // Functions for image pasting
  saveDataUrlToTemp: (dataUrl: string, uniqueId: string) => Promise<SaveDataUrlResponse>;
  deleteTempFile: (filePath: string) => void;
  // Function for opening external URLs securely
  openExternal: (url: string) => Promise<void>;
  // Function to serve temp images
  getTempImage: (filePath: string) => Promise<string | null>;
  // Update-related functions
  getVersion: () => string;
  checkForUpdates: () => Promise<{ updateInfo: unknown; error: string | null }>;
  downloadUpdate: () => Promise<{ success: boolean; error: string | null }>;
  installUpdate: () => void;
  restartApp: () => void;
  onUpdaterEvent: (callback: (event: UpdaterEvent) => void) => void;
  getUpdateState: () => Promise<{ updateAvailable: boolean; latestVersion?: string } | null>;
  isUsingGitHubFallback: () => Promise<boolean>;
  // Recipe warning functions
  closeWindow: () => void;
  hasAcceptedRecipeBefore: (recipe: Recipe) => Promise<boolean>;
  recordRecipeHash: (recipe: Recipe) => Promise<boolean>;
  openDirectoryInExplorer: (directoryPath: string) => Promise<boolean>;
  // PTY terminal functions
  ptyCreate: (
    terminalId: string,
    options?: { cwd?: string; shell?: string }
  ) => Promise<{ success?: boolean; error?: string; pid?: number }>;
  ptyWrite: (terminalId: string, data: string) => void;
  ptyResize: (terminalId: string, cols: number, rows: number) => void;
  ptyKill: (terminalId: string) => void;
  onPtyData: (callback: (terminalId: string, data: string) => void) => void;
  offPtyData: () => void;
  onPtyExit: (callback: (terminalId: string, exitCode: number) => void) => void;
  offPtyExit: () => void;
  // Git source control functions
  gitIsRepo: (cwd: string) => Promise<boolean>;
  gitRepoRoot: (cwd: string) => Promise<string | null>;
  gitCurrentBranch: (cwd: string) => Promise<string | null>;
  gitStatus: (cwd: string) => Promise<{
    staged: Array<{ path: string; oldPath?: string; status: string; staged: boolean }>;
    unstaged: Array<{ path: string; oldPath?: string; status: string; staged: boolean }>;
    untracked: Array<{ path: string; status: string; staged: boolean }>;
    error?: string;
  }>;
  gitDiff: (cwd: string, filePath?: string, staged?: boolean) => Promise<string>;
  gitLog: (
    cwd: string,
    limit?: number,
    skip?: number
  ) => Promise<
    Array<{
      hash: string;
      shortHash: string;
      author: string;
      authorEmail: string;
      date: string;
      message: string;
      body?: string;
    }>
  >;
  gitBranches: (cwd: string) => Promise<{
    current: string | null;
    local: Array<{
      name: string;
      isRemote: boolean;
      isCurrent: boolean;
      upstream?: string;
    }>;
    remote: Array<{
      name: string;
      isRemote: boolean;
      isCurrent: boolean;
      upstream?: string;
    }>;
  }>;
  gitBranchCreate: (
    cwd: string,
    name: string,
    checkout: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  gitBranchCheckout: (cwd: string, name: string) => Promise<{ success: boolean; error?: string }>;
  gitBranchDelete: (
    cwd: string,
    name: string,
    force: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  gitStage: (cwd: string, paths: string[]) => Promise<{ success: boolean; error?: string }>;
  gitUnstage: (cwd: string, paths: string[]) => Promise<{ success: boolean; error?: string }>;
  gitDiscard: (cwd: string, paths: string[]) => Promise<{ success: boolean; error?: string }>;
  gitCommit: (
    cwd: string,
    message: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>;
  gitFetch: (cwd: string) => Promise<{ success: boolean; error?: string }>;
  gitPull: (cwd: string) => Promise<{ success: boolean; error?: string }>;
  gitPush: (cwd: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
  gitRemoteStatus: (cwd: string) => Promise<{
    ahead: number;
    behind: number;
    remote: string | null;
  }>;
  gitStashList: (cwd: string) => Promise<
    Array<{
      index: number;
      ref: string;
      message: string;
      date: string;
    }>
  >;
  gitStashSave: (cwd: string, message?: string) => Promise<{ success: boolean; error?: string }>;
  gitStashPop: (cwd: string, index?: number) => Promise<{ success: boolean; error?: string }>;
  gitStashDrop: (cwd: string, index: number) => Promise<{ success: boolean; error?: string }>;
  gitShowCommit: (
    cwd: string,
    hash: string
  ) => Promise<{
    hash: string;
    shortHash: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
    body?: string;
    stats: string;
  } | null>;
};

type AppConfigAPI = {
  get: (key: string) => unknown;
  getAll: () => Record<string, unknown>;
};

const electronAPI: ElectronAPI = {
  platform: process.platform,
  reactReady: () => ipcRenderer.send('react-ready'),
  getConfig: () => {
    if (!config || Object.keys(config).length === 0) {
      console.warn(
        'No config provided by main process. This may indicate an initialization issue.'
      );
    }
    return config;
  },
  hideWindow: () => ipcRenderer.send('hide-window'),
  directoryChooser: () => ipcRenderer.invoke('directory-chooser'),
  createChatWindow: (
    query?: string,
    dir?: string,
    version?: string,
    resumeSessionId?: string,
    viewType?: string,
    recipeId?: string
  ) =>
    ipcRenderer.send(
      'create-chat-window',
      query,
      dir,
      version,
      resumeSessionId,
      viewType,
      recipeId
    ),
  logInfo: (txt: string) => ipcRenderer.send('logInfo', txt),
  showNotification: (data: NotificationData) => ipcRenderer.send('notify', data),
  showMessageBox: (options: MessageBoxOptions) => ipcRenderer.invoke('show-message-box', options),
  openInChrome: (url: string) => ipcRenderer.send('open-in-chrome', url),
  fetchMetadata: (url: string) => ipcRenderer.invoke('fetch-metadata', url),
  reloadApp: () => ipcRenderer.send('reload-app'),
  checkForOllama: () => ipcRenderer.invoke('check-ollama'),
  selectFileOrDirectory: (defaultPath?: string) =>
    ipcRenderer.invoke('select-file-or-directory', defaultPath),
  getBinaryPath: (binaryName: string) => ipcRenderer.invoke('get-binary-path', binaryName),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', filePath, content),
  ensureDirectory: (dirPath: string) => ipcRenderer.invoke('ensure-directory', dirPath),
  listFiles: (dirPath: string, extension?: string) =>
    ipcRenderer.invoke('list-files', dirPath, extension),
  readDirectoryTree: (dirPath: string, maxDepth = 5) =>
    ipcRenderer.invoke('read-directory-tree', dirPath, maxDepth),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getAllowedExtensions: () => ipcRenderer.invoke('get-allowed-extensions'),
  setMenuBarIcon: (show: boolean) => ipcRenderer.invoke('set-menu-bar-icon', show),
  getMenuBarIconState: () => ipcRenderer.invoke('get-menu-bar-icon-state'),
  setDockIcon: (show: boolean) => ipcRenderer.invoke('set-dock-icon', show),
  getDockIconState: () => ipcRenderer.invoke('get-dock-icon-state'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getSecretKey: () => ipcRenderer.invoke('get-secret-key'),
  getMTSdHostPort: () => ipcRenderer.invoke('get-mtsd-host-port'),
  setWakelock: (enable: boolean) => ipcRenderer.invoke('set-wakelock', enable),
  getWakelockState: () => ipcRenderer.invoke('get-wakelock-state'),
  openNotificationsSettings: () => ipcRenderer.invoke('open-notifications-settings'),
  onMouseBackButtonClicked: (callback: () => void) => {
    // Wrapper that ignores the event parameter.
    const wrappedCallback = (_event: Electron.IpcRendererEvent) => callback();
    ipcRenderer.on('mouse-back-button-clicked', wrappedCallback);
    return wrappedCallback;
  },
  offMouseBackButtonClicked: (callback: () => void) => {
    ipcRenderer.removeListener('mouse-back-button-clicked', callback);
  },
  on: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.on(channel, callback);
  },
  off: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.off(channel, callback);
  },
  emit: (channel: string, ...args: unknown[]) => {
    ipcRenderer.emit(channel, ...args);
  },
  broadcastThemeChange: (themeData: { mode: string; useSystemTheme: boolean; theme: string }) => {
    ipcRenderer.send('broadcast-theme-change', themeData);
  },
  saveDataUrlToTemp: (dataUrl: string, uniqueId: string): Promise<SaveDataUrlResponse> => {
    return ipcRenderer.invoke('save-data-url-to-temp', dataUrl, uniqueId);
  },
  deleteTempFile: (filePath: string): void => {
    ipcRenderer.send('delete-temp-file', filePath);
  },
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('open-external', url);
  },
  getTempImage: (filePath: string): Promise<string | null> => {
    return ipcRenderer.invoke('get-temp-image', filePath);
  },
  getVersion: (): string => {
    return config.MTS_VERSION || ipcRenderer.sendSync('get-app-version') || '';
  },
  checkForUpdates: (): Promise<{ updateInfo: unknown; error: string | null }> => {
    return ipcRenderer.invoke('check-for-updates');
  },
  downloadUpdate: (): Promise<{ success: boolean; error: string | null }> => {
    return ipcRenderer.invoke('download-update');
  },
  installUpdate: (): void => {
    ipcRenderer.invoke('install-update');
  },
  restartApp: (): void => {
    ipcRenderer.send('restart-app');
  },
  onUpdaterEvent: (callback: (event: UpdaterEvent) => void): void => {
    ipcRenderer.on('updater-event', (_event, data) => callback(data));
  },
  getUpdateState: (): Promise<{ updateAvailable: boolean; latestVersion?: string } | null> => {
    return ipcRenderer.invoke('get-update-state');
  },
  isUsingGitHubFallback: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-using-github-fallback');
  },
  closeWindow: () => ipcRenderer.send('close-window'),
  hasAcceptedRecipeBefore: (recipe: Recipe) =>
    ipcRenderer.invoke('has-accepted-recipe-before', recipe),
  recordRecipeHash: (recipe: Recipe) => ipcRenderer.invoke('record-recipe-hash', recipe),
  openDirectoryInExplorer: (directoryPath: string) =>
    ipcRenderer.invoke('open-directory-in-explorer', directoryPath),
  // PTY terminal functions
  ptyCreate: (terminalId: string, options?: { cwd?: string; shell?: string }) =>
    ipcRenderer.invoke('pty-create', terminalId, options),
  ptyWrite: (terminalId: string, data: string) => ipcRenderer.send('pty-write', terminalId, data),
  ptyResize: (terminalId: string, cols: number, rows: number) =>
    ipcRenderer.send('pty-resize', terminalId, cols, rows),
  ptyKill: (terminalId: string) => ipcRenderer.send('pty-kill', terminalId),
  onPtyData: (callback: (terminalId: string, data: string) => void) => {
    const wrappedCallback = (
      _event: Electron.IpcRendererEvent,
      terminalId: string,
      data: string
    ) => callback(terminalId, data);
    ipcRenderer.on('pty-data', wrappedCallback);
  },
  offPtyData: () => {
    ipcRenderer.removeAllListeners('pty-data');
  },
  onPtyExit: (callback: (terminalId: string, exitCode: number) => void) => {
    const wrappedCallback = (
      _event: Electron.IpcRendererEvent,
      terminalId: string,
      exitCode: number
    ) => callback(terminalId, exitCode);
    ipcRenderer.on('pty-exit', wrappedCallback);
  },
  offPtyExit: () => {
    ipcRenderer.removeAllListeners('pty-exit');
  },
  // Git source control functions
  gitIsRepo: (cwd: string) => ipcRenderer.invoke('git-is-repo', cwd),
  gitRepoRoot: (cwd: string) => ipcRenderer.invoke('git-repo-root', cwd),
  gitCurrentBranch: (cwd: string) => ipcRenderer.invoke('git-current-branch', cwd),
  gitStatus: (cwd: string) => ipcRenderer.invoke('git-status', cwd),
  gitDiff: (cwd: string, filePath?: string, staged?: boolean) =>
    ipcRenderer.invoke('git-diff', cwd, filePath, staged),
  gitLog: (cwd: string, limit?: number, skip?: number) =>
    ipcRenderer.invoke('git-log', cwd, limit, skip),
  gitBranches: (cwd: string) => ipcRenderer.invoke('git-branches', cwd),
  gitBranchCreate: (cwd: string, name: string, checkout: boolean) =>
    ipcRenderer.invoke('git-branch-create', cwd, name, checkout),
  gitBranchCheckout: (cwd: string, name: string) =>
    ipcRenderer.invoke('git-branch-checkout', cwd, name),
  gitBranchDelete: (cwd: string, name: string, force: boolean) =>
    ipcRenderer.invoke('git-branch-delete', cwd, name, force),
  gitStage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git-stage', cwd, paths),
  gitUnstage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git-unstage', cwd, paths),
  gitDiscard: (cwd: string, paths: string[]) => ipcRenderer.invoke('git-discard', cwd, paths),
  gitCommit: (cwd: string, message: string, description?: string) =>
    ipcRenderer.invoke('git-commit', cwd, message, description),
  gitFetch: (cwd: string) => ipcRenderer.invoke('git-fetch', cwd),
  gitPull: (cwd: string) => ipcRenderer.invoke('git-pull', cwd),
  gitPush: (cwd: string, force?: boolean) => ipcRenderer.invoke('git-push', cwd, force),
  gitRemoteStatus: (cwd: string) => ipcRenderer.invoke('git-remote-status', cwd),
  gitStashList: (cwd: string) => ipcRenderer.invoke('git-stash-list', cwd),
  gitStashSave: (cwd: string, message?: string) => ipcRenderer.invoke('git-stash-save', cwd, message),
  gitStashPop: (cwd: string, index?: number) => ipcRenderer.invoke('git-stash-pop', cwd, index),
  gitStashDrop: (cwd: string, index: number) => ipcRenderer.invoke('git-stash-drop', cwd, index),
  gitShowCommit: (cwd: string, hash: string) => ipcRenderer.invoke('git-show-commit', cwd, hash),
};

const appConfigAPI: AppConfigAPI = {
  get: (key: string) => config[key],
  getAll: () => config,
};

// Expose the APIs
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('appConfig', appConfigAPI);

// Type declaration for TypeScript
declare global {
  interface Window {
    electron: ElectronAPI;
    appConfig: AppConfigAPI;
  }
}
