import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Package,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { RemoteStatus, GitStash } from './types';

interface TopBarActionsProps {
  remoteStatus: RemoteStatus | null;
  stashes: GitStash[];
  isPulling: boolean;
  isPushing: boolean;
  onPull: () => void;
  onPush: (force?: boolean) => void;
  onStashSave: (message?: string) => void;
  onStashPop: (index?: number) => void;
  onStashDrop: (index: number) => void;
}

export const TopBarActions: React.FC<TopBarActionsProps> = ({
  remoteStatus,
  stashes,
  isPulling,
  isPushing,
  onPull,
  onPush,
  onStashSave,
  onStashPop,
  onStashDrop,
}) => {
  const [stashMessage, setStashMessage] = useState('');
  const [showStashInput, setShowStashInput] = useState(false);

  const handleStashSave = () => {
    onStashSave(stashMessage || undefined);
    setStashMessage('');
    setShowStashInput(false);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Pull Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPull}
        disabled={isPulling}
        className="gap-1.5"
      >
        {isPulling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
        Pull
        {remoteStatus && remoteStatus.behind > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
            {remoteStatus.behind}
          </span>
        )}
      </Button>

      {/* Push Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPushing}
            className="gap-1.5"
          >
            {isPushing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            Push
            {remoteStatus && remoteStatus.ahead > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-mts-blue/20 text-mts-blue rounded">
                {remoteStatus.ahead}
              </span>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onPush(false)}>
            <ArrowUp className="w-4 h-4 mr-2" />
            Push
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onPush(true)} className="text-red-500">
            <ArrowUp className="w-4 h-4 mr-2" />
            Force Push
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Stash Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Package className="w-4 h-4" />
            Stash
            {stashes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-background-muted rounded">
                {stashes.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {showStashInput ? (
            <div className="p-2">
              <input
                type="text"
                placeholder="Stash message (optional)"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStashSave();
                  if (e.key === 'Escape') {
                    setShowStashInput(false);
                    setStashMessage('');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-border-default rounded bg-background-default focus:outline-none focus:ring-2 focus:ring-mts-blue"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleStashSave}>
                  Stash
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowStashInput(false);
                    setStashMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setShowStashInput(true)}>
                <Package className="w-4 h-4 mr-2" />
                Stash Changes...
              </DropdownMenuItem>

              {stashes.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStashPop()}>
                    Apply Latest Stash
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <div className="px-2 py-1 text-xs text-text-muted">Stash List</div>
                  {stashes.map((stash) => (
                    <DropdownMenuItem
                      key={stash.ref}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-sm truncate">{stash.message}</div>
                        <div className="text-xs text-text-muted">{stash.ref}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStashPop(stash.index);
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStashDrop(stash.index);
                          }}
                        >
                          Drop
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TopBarActions;
