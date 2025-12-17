import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ChangesPanel } from './ChangesPanel';
import { HistoryPanel } from './HistoryPanel';
import { GitFile, GitCommit, GitStatusState, ActiveTab } from './types';

interface ChangesHistoryTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  // Changes panel props
  statusState: GitStatusState;
  selectedFile: GitFile | null;
  onSelectFile: (file: GitFile | null) => void;
  onStageFiles: (paths: string[]) => void;
  onUnstageFiles: (paths: string[]) => void;
  onDiscardFiles: (paths: string[]) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  // History panel props
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit | null) => void;
  onLoadMoreCommits: () => void;
  hasMoreCommits: boolean;
  isLoading: boolean;
}

export const ChangesHistoryTabs: React.FC<ChangesHistoryTabsProps> = ({
  activeTab,
  onTabChange,
  statusState,
  selectedFile,
  onSelectFile,
  onStageFiles,
  onUnstageFiles,
  onDiscardFiles,
  onStageAll,
  onUnstageAll,
  commits,
  selectedCommit,
  onSelectCommit,
  onLoadMoreCommits,
  hasMoreCommits,
  isLoading,
}) => {
  const changesCount = statusState.staged.length + statusState.unstaged.length + statusState.untracked.length;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ActiveTab)}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <TabsList className="w-full justify-start rounded-none border-b border-border-default bg-transparent px-2">
        <TabsTrigger
          value="changes"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-mts-blue data-[state=active]:bg-transparent px-4"
        >
          Changes
          {changesCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-background-muted rounded">
              {changesCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-mts-blue data-[state=active]:bg-transparent px-4"
        >
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="changes" className="flex-1 m-0 min-h-0 overflow-hidden">
        <ChangesPanel
          statusState={statusState}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onStageFiles={onStageFiles}
          onUnstageFiles={onUnstageFiles}
          onDiscardFiles={onDiscardFiles}
          onStageAll={onStageAll}
          onUnstageAll={onUnstageAll}
        />
      </TabsContent>

      <TabsContent value="history" className="flex-1 m-0 min-h-0 overflow-hidden">
        <HistoryPanel
          commits={commits}
          selectedCommit={selectedCommit}
          onSelectCommit={onSelectCommit}
          onLoadMore={onLoadMoreCommits}
          hasMore={hasMoreCommits}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ChangesHistoryTabs;
