import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { TreeNode } from './TreeNode';
import { useFolderTree } from './useFolderTree';

const FolderTreeView: React.FC = () => {
  const navigate = useNavigate();
  const {
    rootPath,
    tree,
    expanded,
    loading,
    error,
    loadTree,
    toggleExpanded,
    expandAll,
    collapseAll,
    selectFolder,
    generateTreeString,
  } = useFolderTree();

  useEffect(() => {
    if (rootPath && tree.length === 0) {
      loadTree(rootPath);
    }
  }, [rootPath, loadTree, tree.length]);

  const handleInsertToChat = () => {
    const treeString = generateTreeString();
    navigate('/pair', {
      state: {
        initialMessage: `Here's the folder structure:\n\n\`\`\`\n${treeString}\`\`\``,
      },
    });
  };

  return (
    <MainPanelLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-background-default px-8 pb-4 pt-16">
          <h1 className="text-4xl font-light mb-2">Folder Tree</h1>
          <p className="text-sm text-text-muted mb-4">
            Visualize and share your project structure
          </p>

          {/* Current Path & Actions */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-muted truncate" title={rootPath}>
                {rootPath || 'No folder selected'}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={selectFolder}>
              <FolderOpen className="w-4 h-4 mr-1.5" />
              Select Folder
            </Button>
          </div>

          {/* Tree Controls */}
          {tree.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse All
              </Button>
              <div className="flex-1" />
              <Button variant="default" size="sm" onClick={handleInsertToChat}>
                <MessageSquarePlus className="w-4 h-4 mr-1.5" />
                Insert into Chat
              </Button>
            </div>
          )}
        </div>

        {/* Tree Content */}
        <div className="flex-1 min-h-0 px-8 pb-8">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-text-muted">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              {error}
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-muted">
              <p>No folder loaded</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={selectFolder}>
                Select a folder to view its structure
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <ul className="list-none font-mono text-sm">
                {tree.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>
    </MainPanelLayout>
  );
};

export default FolderTreeView;
