import React from 'react';
import { GitCommit } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { GitCommit as GitCommitType } from './types';

interface HistoryPanelProps {
  commits: GitCommitType[];
  selectedCommit: GitCommitType | null;
  onSelectCommit: (commit: GitCommitType | null) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  commits,
  selectedCommit,
  onSelectCommit,
  onLoadMore,
  hasMore,
  isLoading,
}) => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Loading history...
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        No commit history
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {commits.map((commit) => (
          <button
            key={commit.hash}
            className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
              selectedCommit?.hash === commit.hash
                ? 'bg-mts-blue/20'
                : 'hover:bg-background-muted'
            }`}
            onClick={() => onSelectCommit(commit)}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-background-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <GitCommit className="w-4 h-4 text-text-muted" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{commit.message}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-mono">{commit.shortHash}</span>
                  <span>•</span>
                  <span>{commit.author}</span>
                  <span>•</span>
                  <span>{formatDate(commit.date)}</span>
                </div>

                {commit.body && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{commit.body}</p>
                )}
              </div>
            </div>
          </button>
        ))}

        {hasMore && (
          <button
            className="w-full py-2 text-sm text-mts-blue hover:underline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load more commits'}
          </button>
        )}
      </div>
    </ScrollArea>
  );
};

export default HistoryPanel;
