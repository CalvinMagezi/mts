import React from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

interface CommitPanelProps {
  summary: string;
  description: string;
  onSummaryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCommit: () => void;
  isCommitting: boolean;
  currentBranch: string | null;
  stagedCount: number;
}

export const CommitPanel: React.FC<CommitPanelProps> = ({
  summary,
  description,
  onSummaryChange,
  onDescriptionChange,
  onCommit,
  isCommitting,
  currentBranch,
  stagedCount,
}) => {
  const canCommit = summary.trim().length > 0 && stagedCount > 0 && !isCommitting;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCommit) {
      onCommit();
    }
  };

  return (
    <div className="border-t border-border-default p-3 bg-background-default">
      {/* Summary Input */}
      <input
        type="text"
        placeholder="Summary (required)"
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm border border-border-default rounded-t bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue placeholder:text-text-muted"
        disabled={isCommitting}
      />

      {/* Description Textarea */}
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-sm border border-t-0 border-border-default rounded-b bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue placeholder:text-text-muted resize-none"
        rows={3}
        disabled={isCommitting}
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
