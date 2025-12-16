import React from 'react';
import { Check } from 'lucide-react';
import { GitFile, GitFileStatus } from './types';

interface FileStatusItemProps {
  file: GitFile;
  isSelected: boolean;
  onSelect: (file: GitFile) => void;
  onToggleStage: (file: GitFile) => void;
  showCheckbox?: boolean;
}

const statusColors: Record<GitFileStatus, string> = {
  M: 'text-yellow-500',
  A: 'text-green-500',
  D: 'text-red-500',
  R: 'text-purple-500',
  C: 'text-blue-500',
  U: 'text-orange-500',
  '?': 'text-gray-400',
  '!': 'text-gray-600',
};

const statusLabels: Record<GitFileStatus, string> = {
  M: 'Modified',
  A: 'Added',
  D: 'Deleted',
  R: 'Renamed',
  C: 'Copied',
  U: 'Unmerged',
  '?': 'Untracked',
  '!': 'Ignored',
};

export const FileStatusItem: React.FC<FileStatusItemProps> = ({
  file,
  isSelected,
  onSelect,
  onToggleStage,
  showCheckbox = true,
}) => {
  const fileName = file.path.split('/').pop() || file.path;
  const directory = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-background-muted transition-colors ${
        isSelected ? 'bg-mts-blue/20' : ''
      }`}
      onClick={() => onSelect(file)}
    >
      {showCheckbox && (
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleStage(file);
          }}
          className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            file.staged
              ? 'bg-mts-blue border-mts-blue'
              : 'border-border-default hover:border-mts-blue'
          }`}
        >
          {file.staged && <Check className="w-3 h-3 text-white" />}
        </button>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className={`font-mono text-sm font-bold w-4 flex-shrink-0 ${statusColors[file.status as GitFileStatus] || 'text-text-muted'}`}
          title={statusLabels[file.status as GitFileStatus] || file.status}
        >
          {file.status}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span className="truncate text-sm text-text-default">{fileName}</span>
          {directory && (
            <span className="text-xs text-text-muted truncate flex-shrink">{directory}/</span>
          )}
        </div>

        {file.oldPath && (
          <span className="text-xs text-text-muted truncate">
            (from {file.oldPath.split('/').pop()})
          </span>
        )}
      </div>
    </div>
  );
};

export default FileStatusItem;
