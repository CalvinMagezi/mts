import React, { useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AlertCircle, X } from 'lucide-react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { Button } from '../ui/button';
import { useSourceControl } from './useSourceControl';
import { RepositoryHeader } from './RepositoryHeader';
import { ChangesHistoryTabs } from './ChangesHistoryTabs';
import { CommitPanel } from './CommitPanel';
import { TopBarActions } from './TopBarActions';
import { DiffView } from './DiffView';
import { EmptyStateView } from './EmptyStateView';

const SourceControlView: React.FC = () => {
  const sourceControl = useSourceControl();

  const handleSelectFolder = useCallback(async () => {
    const result = await window.electron.directoryChooser();
    if (!result.canceled && result.filePaths.length > 0) {
      sourceControl.setWorkingDir(result.filePaths[0]);
    }
  }, [sourceControl]);

  const handleOpenInEditor = useCallback(() => {
    if (sourceControl.repoState.rootPath) {
      window.electron.openDirectoryInExplorer(sourceControl.repoState.rootPath);
    }
  }, [sourceControl.repoState.rootPath]);

  const handleShowInFinder = useCallback(() => {
    if (sourceControl.repoState.rootPath) {
      window.electron.openDirectoryInExplorer(sourceControl.repoState.rootPath);
    }
  }, [sourceControl.repoState.rootPath]);

  // Not a git repository
  if (!sourceControl.repoState.isRepo && !sourceControl.isLoading) {
    return (
      <MainPanelLayout>
        <EmptyStateView type="not-repo" onSelectFolder={handleSelectFolder} />
      </MainPanelLayout>
    );
  }

  // Loading state
  if (sourceControl.isLoading && !sourceControl.repoState.isRepo) {
    return (
      <MainPanelLayout>
        <div className="flex items-center justify-center h-full text-text-muted">
          Loading repository...
        </div>
      </MainPanelLayout>
    );
  }

  const hasChanges =
    sourceControl.statusState.staged.length > 0 ||
    sourceControl.statusState.unstaged.length > 0 ||
    sourceControl.statusState.untracked.length > 0;

  return (
    <MainPanelLayout>
      <div className="flex flex-col h-full">
        {/* Error Banner */}
        {sourceControl.error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{sourceControl.error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={sourceControl.clearError}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="bg-background-default px-4 pb-2 pt-12 border-b border-border-default">
          <RepositoryHeader
            repoState={sourceControl.repoState}
            branches={sourceControl.branches}
            isFetching={sourceControl.isFetching}
            onFetch={sourceControl.fetch}
            onCheckoutBranch={sourceControl.checkoutBranch}
            onCreateBranch={sourceControl.createBranch}
            onDeleteBranch={sourceControl.deleteBranch}
            onSelectFolder={handleSelectFolder}
          />
          <TopBarActions
            remoteStatus={sourceControl.repoState.remoteStatus}
            stashes={sourceControl.stashes}
            isPulling={sourceControl.isPulling}
            isPushing={sourceControl.isPushing}
            onPull={sourceControl.pull}
            onPush={sourceControl.push}
            onStashSave={sourceControl.stashSave}
            onStashPop={sourceControl.stashPop}
            onStashDrop={sourceControl.stashDrop}
          />
        </div>

        {/* Main Content */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Changes/History + Commit */}
          <Panel defaultSize={35} minSize={25} maxSize={50}>
            <div className="flex flex-col h-full bg-background-default overflow-hidden">
              {hasChanges || sourceControl.activeTab === 'history' ? (
                <>
                  <ChangesHistoryTabs
                    activeTab={sourceControl.activeTab}
                    onTabChange={sourceControl.setActiveTab}
                    statusState={sourceControl.statusState}
                    selectedFile={sourceControl.selectedFile}
                    onSelectFile={sourceControl.setSelectedFile}
                    onStageFiles={sourceControl.stageFiles}
                    onUnstageFiles={sourceControl.unstageFiles}
                    onDiscardFiles={sourceControl.discardFiles}
                    onStageAll={sourceControl.stageAll}
                    onUnstageAll={sourceControl.unstageAll}
                    commits={sourceControl.commits}
                    selectedCommit={sourceControl.selectedCommit}
                    onSelectCommit={sourceControl.setSelectedCommit}
                    onLoadMoreCommits={sourceControl.loadMoreCommits}
                    hasMoreCommits={sourceControl.hasMoreCommits}
                    isLoading={sourceControl.isLoading}
                  />
                  {sourceControl.activeTab === 'changes' && (
                    <div className="flex-shrink-0">
                    <CommitPanel
                      summary={sourceControl.commitSummary}
                      description={sourceControl.commitDescription}
                      onSummaryChange={sourceControl.setCommitSummary}
                      onDescriptionChange={sourceControl.setCommitDescription}
                      onCommit={sourceControl.commit}
                      isCommitting={sourceControl.isCommitting}
                      currentBranch={sourceControl.repoState.currentBranch}
                      stagedCount={sourceControl.statusState.staged.length}
                    />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-4">
                  <p className="text-sm">No changes</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => sourceControl.setActiveTab('history')}
                  >
                    View History
                  </Button>
                </div>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 mx-0.5 bg-border-default hover:bg-mts-blue transition-colors cursor-col-resize" />

          {/* Right Panel - Diff View or Empty State */}
          <Panel defaultSize={65} minSize={40}>
            <div className="h-full bg-background-default">
              {!hasChanges && sourceControl.activeTab === 'changes' ? (
                <EmptyStateView
                  type="no-changes"
                  repoName={sourceControl.repoState.repoName || undefined}
                  onOpenInEditor={handleOpenInEditor}
                  onShowInFinder={handleShowInFinder}
                />
              ) : (
                <DiffView
                  file={sourceControl.selectedFile}
                  diffContent={sourceControl.diffContent}
                  isLoading={sourceControl.diffLoading}
                />
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </MainPanelLayout>
  );
};

export default SourceControlView;
