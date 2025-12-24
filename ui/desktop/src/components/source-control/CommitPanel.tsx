import React from 'react';
import { Button } from '../ui/button';
import { Loader2, Sparkles } from 'lucide-react';

interface CommitPanelProps {
  summary: string;
  description: string;
  onSummaryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCommit: () => void;
  onGenerateCommitMessage: () => void;
  isCommitting: boolean;
  isGeneratingCommitMessage: boolean;
  currentBranch: string | null;
  stagedCount: number;
  totalChangesCount: number;
}

export const CommitPanel: React.FC<CommitPanelProps> = ({
  summary,
  description,
  onSummaryChange,
  onDescriptionChange,
  onCommit,
  onGenerateCommitMessage,
  isCommitting,
  isGeneratingCommitMessage,
  currentBranch,
  stagedCount,
  totalChangesCount,
}) => {
  const canCommit = summary.trim().length > 0 && stagedCount > 0 && !isCommitting;
  // Allow generating from all changes (staged or unstaged)
  const canGenerateMessage = totalChangesCount > 0 && !isCommitting && !isGeneratingCommitMessage;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCommit) {
      onCommit();
    }
  };

  return (
    <div className="border-t border-border-default p-3 bg-background-default">
      {/* Summary Input with AI Button */}
      <div className="relative">
        <input
          type="text"
          placeholder="Summary (required)"
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 pr-10 text-sm border border-border-default rounded-t bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue placeholder:text-text-muted"
          disabled={isCommitting || isGeneratingCommitMessage}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={onGenerateCommitMessage}
          disabled={!canGenerateMessage}
          title="Generate commit message with AI"
        >
          {isGeneratingCommitMessage ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          ) : (
            <Sparkles className="w-4 h-4 text-text-muted hover:text-mts-blue" />
          )}
        </Button>
      </div>

      {/* Description Textarea */}
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm border border-t-0 border-border-default rounded-b bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue placeholder:text-text-muted resize-none"
        rows={3}
        disabled={isCommitting || isGeneratingCommitMessage}
      />

      {/* Commit Button */}
      <Button
        className="w-full mt-3"
        onClick={onCommit}
        disabled={!canCommit}
      >
        {isCommitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Committing...
          </>
        ) : (
          <>
            Commit to <strong className="ml-1">{currentBranch || 'main'}</strong>
          </>
        )}
      </Button>

      {stagedCount === 0 && (
        <p className="text-xs text-text-muted mt-2 text-center">
          Stage changes to enable commit
        </p>
      )}
    </div>
  );
};

export default CommitPanel;
