import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { OpenFile } from './types';

interface FileTabBarProps {
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  onSelectTab: (filePath: string) => void;
  onCloseTab: (filePath: string, e: React.MouseEvent) => void;
}

export const FileTabBar: React.FC<FileTabBarProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
}) => {
  if (openFiles.size === 0) {
    return null;
  }

  const filesArray = Array.from(openFiles.entries());

  return (
    <div className="border-b border-border-default bg-background-medium/30">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0.5 px-2 py-1 min-w-max">
          {filesArray.map(([filePath, openFile]) => {
            const isActive = filePath === activeFilePath;
            return (
              <div
                key={filePath}
                className={`
                  group flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
                  border-b-2 transition-colors
                  ${
                    isActive
                      ? 'bg-background-default border-mts-blue text-text-default'
                      : 'bg-transparent border-transparent text-text-muted hover:bg-background-medium/50 hover:text-text-default'
                  }
                `}
                onClick={() => onSelectTab(filePath)}
                title={filePath}
              >
                <span className="text-sm max-w-[150px] truncate">
                  {openFile.node.name}
                </span>
                {openFile.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`
                    h-4 w-4 p-0 hover:bg-background-medium
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                  onClick={(e) => onCloseTab(filePath, e)}
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
