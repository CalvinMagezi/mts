import React from 'react';
import { Plus, Minus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { FileStatusItem } from './FileStatusItem';
import { GitFile, GitStatusState } from './types';

interface ChangesPanelProps {
  statusState: GitStatusState;
  selectedFile: GitFile | null;
  onSelectFile: (file: GitFile | null) => void;
  onStageFiles: (paths: string[]) => void;
  onUnstageFiles: (paths: string[]) => void;
  onDiscardFiles: (paths: string[]) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({
  statusState,
  selectedFile,
  onSelectFile,
  onStageFiles,
  onUnstageFiles,
  onDiscardFiles,
  onStageAll,
  onUnstageAll,
}) => {
  const [stagedExpanded, setStagedExpanded] = React.useState(true);
  const [changesExpanded, setChangesExpanded] = React.useState(true);

  const hasStaged = statusState.staged.length > 0;
  const hasUnstaged = statusState.unstaged.length > 0 || statusState.untracked.length > 0;
  const allChanges = [...statusState.unstaged, ...statusState.untracked];

  const handleToggleStage = (file: GitFile) => {
    if (file.staged) {
      onUnstageFiles([file.path]);
    } else {
      onStageFiles([file.path]);
    }
  };

  if (statusState.loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Loading changes...
      </div>
    );
  }

  if (!hasStaged && !hasUnstaged) {
    return null; // Let parent show empty state
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {/* Staged Changes */}
        {hasStaged && (
          <div className="mb-4">
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 text-left hover:bg-background-muted rounded transition-colors"
              onClick={() => setStagedExpanded(!stagedExpanded)}
            >
              <div className="flex items-center gap-2">
                {stagedExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">Staged Changes</span>
                <span className="text-xs text-text-muted bg-background-muted px-1.5 py-0.5 rounded">
                  {statusState.staged.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnstageAll();
                }}
                title="Unstage all"
              >
                <Minus className="w-3 h-3" />
              </Button>
            </button>

            {stagedExpanded && (
              <div className="mt-1">
                {statusState.staged.map((file) => (
                  <FileStatusItem
                    key={`staged-${file.path}`}
                    file={file}
                    isSelected={selectedFile?.path === file.path && selectedFile?.staged}
                    onSelect={onSelectFile}
                    onToggleStage={handleToggleStage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unstaged Changes */}
        {hasUnstaged && (
          <div>
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 text-left hover:bg-background-muted rounded transition-colors group"
              onClick={() => setChangesExpanded(!changesExpanded)}
            >
              <div className="flex items-center gap-2">
                {changesExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">Changes</span>
                <span className="text-xs text-text-muted bg-background-muted px-1.5 py-0.5 rounded">
                  {allChanges.length}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    const paths = allChanges.map((f) => f.path);
                    onDiscardFiles(paths);
                  }}
                  title="Discard all changes"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStageAll();
                  }}
                  title="Stage all"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </button>

            {changesExpanded && (
              <div className="mt-1">
                {allChanges.map((file) => (
                  <FileStatusItem
                    key={`unstaged-${file.path}`}
                    file={file}
                    isSelected={selectedFile?.path === file.path && !selectedFile?.staged}
                    onSelect={onSelectFile}
                    onToggleStage={handleToggleStage}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ChangesPanel;
