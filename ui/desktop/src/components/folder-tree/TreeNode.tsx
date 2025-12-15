import React from 'react';
import { ChevronDown, ChevronRight, Folder, File } from 'lucide-react';
import { cn } from '../../utils';
import { FileNode } from './types';

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath?: string;
  onSelect: (node: FileNode) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
}) => {
  const isExpanded = expanded.has(node.path);
  const hasChildren = node.isDir && node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDir) {
      onToggle(node.path);
    } else {
      onSelect(node);
    }
  };

  return (
    <li className="select-none">
      <div
        className={cn(
          'flex items-center py-0.5 rounded cursor-pointer',
          isSelected ? 'bg-mts-blue/20 text-text-default' : 'hover:bg-background-medium/50'
        )}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={handleClick}
      >
        {node.isDir ? (
          <span className="w-5 h-5 flex items-center justify-center text-text-muted">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        ) : (
          <span className="w-5" />
        )}

        {node.isDir ? (
          <Folder className="w-4 h-4 mr-1.5 text-mts-blue" />
        ) : (
          <File className="w-4 h-4 mr-1.5 text-text-muted" />
        )}

        <span
          className={cn('text-sm', node.isDir ? 'font-medium' : 'text-text-muted', isSelected && 'text-text-default')}
        >
          {node.name}
        </span>
      </div>

      {node.isDir && isExpanded && hasChildren && (
        <ul className="list-none">
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
