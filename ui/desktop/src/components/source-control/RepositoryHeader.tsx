import React, { useState } from 'react';
import {
  GitBranch,
  ChevronDown,
  RefreshCw,
  FolderOpen,
  Plus,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { GitRepoState, BranchesState } from './types';

interface RepositoryHeaderProps {
  repoState: GitRepoState;
  branches: BranchesState;
  isFetching: boolean;
  onFetch: () => void;
  onCheckoutBranch: (name: string) => void;
  onCreateBranch: (name: string, checkout?: boolean) => void;
  onDeleteBranch: (name: string, force?: boolean) => void;
  onSelectFolder: () => void;
}

export const RepositoryHeader: React.FC<RepositoryHeaderProps> = ({
  repoState,
  branches,
  isFetching,
  onFetch,
  onCheckoutBranch,
  onCreateBranch,
  onDeleteBranch,
  onSelectFolder,
}) => {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim(), true);
      setNewBranchName('');
      setIsCreatingBranch(false);
    }
  };

  const formatLastFetched = (date: Date | null): string => {
    if (!date) return 'Never fetched';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Repository Row */}
      <div className="flex items-center gap-2">
        {/* Repository Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between h-9">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-text-muted uppercase tracking-wide">Current Repository</span>
                <span className="font-medium truncate">{repoState.repoName || 'Unknown'}</span>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Repository</DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <span className="truncate">{repoState.rootPath}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSelectFolder}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Open Different Repository
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Branch Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between h-9">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs text-text-muted uppercase tracking-wide">Current Branch</span>
                <span className="font-medium truncate">{repoState.currentBranch || 'Unknown'}</span>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-auto">
            {isCreatingBranch ? (
              <div className="p-2">
                <input
                  type="text"
                  placeholder="New branch name..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBranch();
                    if (e.key === 'Escape') {
                      setIsCreatingBranch(false);
                      setNewBranchName('');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-border-default rounded bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingBranch(false);
                      setNewBranchName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setIsCreatingBranch(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Branch...
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {branches.local.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-text-muted">Local Branches</DropdownMenuLabel>
                    {branches.local.map((branch) => (
                      <DropdownMenuItem
                        key={branch.name}
                        className="flex items-center justify-between group"
                        onClick={() => {
                          if (!branch.isCurrent) onCheckoutBranch(branch.name);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {branch.isCurrent && <Check className="w-4 h-4 text-mts-green" />}
                          <span className={branch.isCurrent ? 'font-medium' : ''}>{branch.name}</span>
                        </div>
                        {!branch.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBranch(branch.name);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {branches.remote.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-text-muted">Remote Branches</DropdownMenuLabel>
                    {branches.remote.slice(0, 10).map((branch) => (
                      <DropdownMenuItem
                        key={branch.name}
                        onClick={() => onCheckoutBranch(branch.name)}
                        className="text-text-muted"
                      >
                        {branch.name}
                      </DropdownMenuItem>
                    ))}
                    {branches.remote.length > 10 && (
                      <DropdownMenuItem disabled className="text-xs text-text-muted">
                        ... and {branches.remote.length - 10} more
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fetch Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFetch}
          disabled={isFetching}
          className="h-9 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-medium">Fetch origin</span>
            <span className="text-[10px] text-text-muted">
              {isFetching ? 'Fetching...' : formatLastFetched(repoState.lastFetched)}
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default RepositoryHeader;
