import React from 'react';
import { ChevronDown, ChevronRight, Folder, File } from 'lucide-react';
import { FileNode } from './types';

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, expanded, onToggle }) => {
  const isExpanded = expanded.has(node.path);
  const hasChildren = node.isDir && node.children && node.children.length > 0;

  return (
    <li className="select-none">
      <div
        className="flex items-center py-0.5 hover:bg-background-medium/50 rounded cursor-default"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {node.isDir ? (
          <button
            onClick={() => onToggle(node.path)}
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-default"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {node.isDir ? (
          <Folder className="w-4 h-4 mr-1.5 text-mts-blue" />
        ) : (
          <File className="w-4 h-4 mr-1.5 text-text-muted" />
        )}

        <span
          className={`text-sm ${node.isDir ? 'font-medium cursor-pointer' : 'text-text-muted'}`}
          onClick={() => node.isDir && onToggle(node.path)}
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
            />
          ))}
        </ul>
      )}
    </li>
  );
};
