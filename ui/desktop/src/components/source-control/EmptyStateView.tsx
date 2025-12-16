import React from 'react';
import { FolderGit2, CheckCircle2, FolderOpen, ExternalLink, Folder } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateViewProps {
  type: 'not-repo' | 'no-changes';
  repoName?: string;
  onOpenInEditor?: () => void;
  onShowInFinder?: () => void;
  onViewOnGitHub?: () => void;
  onSelectFolder?: () => void;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  type,
  repoName,
  onOpenInEditor,
  onShowInFinder,
  onViewOnGitHub,
  onSelectFolder,
}) => {
  if (type === 'not-repo') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 mb-6 rounded-full bg-background-muted flex items-center justify-center">
          <FolderGit2 className="w-8 h-8 text-text-muted" />
        </div>
        <h2 className="text-2xl font-light mb-2 text-text-default">No Repository Found</h2>
        <p className="text-text-muted mb-6 max-w-md">
          The current directory is not a Git repository. Initialize a repository or open a folder
          that contains one.
        </p>
        {onSelectFolder && (
          <Button onClick={onSelectFolder} variant="outline">
            <FolderOpen className="w-4 h-4 mr-2" />
            Select Folder
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-20 h-20 mb-6 rounded-full bg-mts-green/10 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-mts-green" />
      </div>
      <h2 className="text-3xl font-light mb-2 text-text-default">No local changes</h2>
      <p className="text-text-muted mb-8">
        There are no uncommitted changes in this repository.
        {repoName && (
          <span className="block mt-1">Here are some friendly suggestions for what to do next.</span>
        )}
      </p>

      <div className="w-full max-w-lg space-y-3">
        {onOpenInEditor && (
          <button
            onClick={onOpenInEditor}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border-default bg-background-default hover:bg-background-muted transition-colors group"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium text-text-default">Open the repository in your external editor</span>
              <span className="text-sm text-text-muted">Select your editor in Settings</span>
            </div>
            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              Open in External Editor
            </Button>
          </button>
        )}

        {onShowInFinder && (
          <button
            onClick={onShowInFinder}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border-default bg-background-default hover:bg-background-muted transition-colors group"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium text-text-default">View the files of your repository in Finder</span>
              <span className="text-sm text-text-muted">Repository menu</span>
            </div>
            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Folder className="w-4 h-4 mr-1.5" />
              Show in Finder
            </Button>
          </button>
        )}

        {onViewOnGitHub && (
          <button
            onClick={onViewOnGitHub}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border-default bg-background-default hover:bg-background-muted transition-colors group"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium text-text-default">Open the repository page on GitHub in your browser</span>
              <span className="text-sm text-text-muted">Repository menu</span>
            </div>
            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              View on GitHub
            </Button>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyStateView;
