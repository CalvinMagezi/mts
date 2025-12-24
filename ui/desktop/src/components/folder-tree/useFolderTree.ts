import { useState, useCallback } from 'react';
import { FileNode } from './types';
import { useFileEditor } from './useFileEditor';

export function useFolderTree(initialPath?: string) {
  const [rootPath, setRootPath] = useState<string>(
    initialPath || (window.appConfig.get('MTS_WORKING_DIR') as string) || ''
  );
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  // File editor integration
  const fileEditor = useFileEditor();

  const loadTree = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const nodes = await window.electron.readDirectoryTree(path, 5);
      setTree(nodes);
      setRootPath(path);
      // Auto-expand first level
      const firstLevelDirs = nodes.filter((n) => n.isDir).map((n) => n.path);
      setExpanded(new Set(firstLevelDirs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleExpanded = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allDirs = new Set<string>();
    const collectDirs = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.isDir) {
          allDirs.add(node.path);
          if (node.children) {
            collectDirs(node.children);
          }
        }
      }
    };
    collectDirs(tree);
    setExpanded(allDirs);
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const selectFolder = useCallback(async () => {
    const result = await window.electron.directoryChooser();
    if (!result.canceled && result.filePaths[0]) {
      await loadTree(result.filePaths[0]);
    }
  }, [loadTree]);

  const selectFile = useCallback((node: FileNode | null) => {
    if (node && !node.isDir) {
      setSelectedFile(node);
    }
  }, []);

  const enterEditMode = useCallback(async () => {
    if (!selectedFile) return;

    // Check if file is already open
    if (fileEditor.openFiles.has(selectedFile.path)) {
      // Just switch to it
      await fileEditor.switchFile(selectedFile.path);
    } else {
      // Load file content and open in editor
      try {
        const result = await window.electron.readFile(selectedFile.path);
        if (result.found && !result.error) {
          fileEditor.openFileForEditing(selectedFile, result.file);
        } else {
          setError(result.error || 'Failed to read file');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file');
      }
    }
  }, [selectedFile, fileEditor]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const generateTreeString = useCallback((): string => {
    const rootName = rootPath.split('/').pop() || rootPath;
    let result = `${rootName}/\n`;

    const generate = (nodes: FileNode[], prefix: string): string => {
      let output = '';

      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const extension = isLast ? '    ' : '│   ';

        output += prefix + connector + node.name + (node.isDir ? '/' : '') + '\n';

        if (node.isDir && node.children && expanded.has(node.path)) {
          output += generate(node.children, prefix + extension);
        }
      });

      return output;
    };

    result += generate(tree, '');
    return result;
  }, [tree, expanded, rootPath]);

  return {
    rootPath,
    tree,
    expanded,
    loading,
    error,
    selectedFile,
    loadTree,
    toggleExpanded,
    expandAll,
    collapseAll,
    selectFolder,
    selectFile,
    clearSelection,
    generateTreeString,
    // File editor functions
    openFiles: fileEditor.openFiles,
    activeFilePath: fileEditor.activeFilePath,
    enterEditMode,
    closeFile: fileEditor.closeFile,
    switchFile: fileEditor.switchFile,
    saveFile: fileEditor.saveFile,
    updateFileContent: fileEditor.updateFileContent,
  };
}
