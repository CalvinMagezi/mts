import React, { useState } from 'react';
import { Replace, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'react-toastify';

interface ReplacePanelProps {
  query: string;
  workingDir: string;
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
  includePattern: string;
  excludePattern: string;
  totalMatches: number;
  totalFiles: number;
  results: Array<{ filePath: string }>;
}

export const ReplacePanel: React.FC<ReplacePanelProps> = ({
  query,
  workingDir,
  caseSensitive,
  useRegex,
  wholeWord,
  includePattern,
  excludePattern,
  totalMatches,
  totalFiles,
}) => {
  const [replacement, setReplacement] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReplace = async () => {
    if (!query || !replacement) {
      toast.error('Please enter both search query and replacement text');
      return;
    }

    if (totalMatches === 0) {
      toast.error('No matches to replace');
      return;
    }

    // Show confirmation
    setShowConfirmation(true);
  };

  const executeReplace = async () => {
    setShowConfirmation(false);
    setIsReplacing(true);

    try {
      const baseUrl = (window.appConfig.get('BACKEND_URL') as string) || '';
      const secretKey = await window.electron.getSecretKey();

      const response = await fetch(`${baseUrl}/search/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': secretKey,
        },
        body: JSON.stringify({
          query,
          replacement,
          workingDir,
          caseSensitive,
          useRegex,
          wholeWord,
          includePattern: includePattern || undefined,
          excludePattern: excludePattern || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Replace operation failed');
      }

      const data = await response.json();
      toast.success(
        `Replaced ${data.totalReplacements} occurrences in ${data.filesModified} files`
      );

      // Clear replacement field
      setReplacement('');
    } catch (err) {
      console.error('Replace error:', err);
      toast.error(err instanceof Error ? err.message : 'Replace failed');
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-background-medium/20 rounded-lg border border-border-default">
      <div className="flex items-center gap-2 mb-2">
        <Replace className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium">Replace</span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Replace with..."
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          className="flex-1"
          disabled={isReplacing}
        />

        <Button
          variant="default"
          size="sm"
          onClick={handleReplace}
          disabled={isReplacing || !query || !replacement || totalMatches === 0}
          className="px-4"
        >
          {isReplacing ? 'Replacing...' : 'Replace All'}
        </Button>
      </div>

      {totalMatches > 0 && (
        <div className="mt-2 text-xs text-text-muted">
          Will replace {totalMatches.toLocaleString()} occurrences in {totalFiles.toLocaleString()}{' '}
          files
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-default rounded-lg border border-border-default p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium mb-1">Confirm Replace All</h3>
                <p className="text-sm text-text-muted">
                  This will replace {totalMatches.toLocaleString()} occurrences in{' '}
                  {totalFiles.toLocaleString()} files. This action cannot be undone without using
                  version control.
                </p>
                <div className="mt-3 p-3 bg-background-medium/30 rounded text-xs font-mono">
                  <div className="text-text-muted">Replace:</div>
                  <div className="text-red-400">{query}</div>
                  <div className="text-text-muted mt-1">With:</div>
                  <div className="text-green-400">{replacement}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={executeReplace}>
                Replace All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
