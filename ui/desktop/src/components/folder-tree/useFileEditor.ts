import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FileNode, OpenFile } from './types';
import { getLanguageFromPath } from './useFilePreview';

interface UseFileEditorResult {
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  openFileForEditing: (node: FileNode, content: string) => void;
  closeFile: (filePath: string) => Promise<boolean>;
  switchFile: (filePath: string) => Promise<void>;
  saveFile: (filePath: string) => Promise<void>;
  updateFileContent: (filePath: string, content: string) => void;
  getActiveFile: () => OpenFile | null;
}

export const useFileEditor = (): UseFileEditorResult => {
  const [openFiles, setOpenFiles] = useState<Map<string, OpenFile>>(new Map());
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

  const openFileForEditing = useCallback((node: FileNode, content: string) => {
    const openFile: OpenFile = {
      node,
      content,
      originalContent: content,
      isDirty: false,
      language: getLanguageFromPath(node.path),
    };

    setOpenFiles((prev) => {
      const next = new Map(prev);
      next.set(node.path, openFile);
      return next;
    });
    setActiveFilePath(node.path);
  }, []);

  const confirmUnsavedChanges = useCallback(
    async (fileName: string): Promise<0 | 1 | 2> => {
      const result = await window.electron.showMessageBox({
        type: 'warning',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        title: 'Unsaved Changes',
        message: `Do you want to save changes to ${fileName}?`,
        detail: 'Your changes will be lost if you do not save them.',
      });

      return result.response as 0 | 1 | 2;
    },
    []
  );

  const saveFile = useCallback(async (filePath: string) => {
    const file = openFiles.get(filePath);
    if (!file) return;

    try {
      const success = await window.electron.writeFile(file.node.path, file.content);
      if (success) {
        setOpenFiles((prev) => {
          const next = new Map(prev);
          const updated = next.get(filePath);
          if (updated) {
            updated.originalContent = updated.content;
            updated.isDirty = false;
          }
          return next;
        });
        toast.success(`File saved: ${file.node.name}`);
      } else {
        throw new Error('Failed to write file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      const result = await window.electron.showMessageBox({
        type: 'error',
        buttons: ['Retry', 'Cancel'],
        defaultId: 0,
        title: 'Save Failed',
        message: `Could not save ${file.node.name}`,
        detail: error instanceof Error ? error.message : 'Unknown error',
      });

      if (result.response === 0) {
        await saveFile(filePath);
      }
    }
  }, [openFiles]);

  const closeFile = useCallback(
    async (filePath: string): Promise<boolean> => {
      const file = openFiles.get(filePath);
      if (!file) return true;

      if (file.isDirty) {
        const response = await confirmUnsavedChanges(file.node.name);

        if (response === 0) {
          // Save
          await saveFile(filePath);
        } else if (response === 2) {
          // Cancel
          return false;
        }
        // Response 1 = Discard, continue closing
      }

      setOpenFiles((prev) => {
        const next = new Map(prev);
        next.delete(filePath);
        return next;
      });

      // Switch to another tab if this was the active one
      if (activeFilePath === filePath) {
        const remaining = Array.from(openFiles.keys()).filter((p) => p !== filePath);
        setActiveFilePath(remaining.length > 0 ? remaining[0] : null);
      }

      return true;
    },
    [openFiles, activeFilePath, confirmUnsavedChanges, saveFile]
  );

  const switchFile = useCallback(
    async (filePath: string) => {
      if (activeFilePath === filePath) return;

      const currentFile = activeFilePath ? openFiles.get(activeFilePath) : null;

      if (currentFile?.isDirty) {
        const response = await confirmUnsavedChanges(currentFile.node.name);

        if (response === 0) {
          // Save
          await saveFile(activeFilePath!);
        } else if (response === 2) {
          // Cancel
          return;
        }
        // Response 1 = Discard, continue switching
      }

      setActiveFilePath(filePath);
    },
    [activeFilePath, openFiles, confirmUnsavedChanges, saveFile]
  );

  const updateFileContent = useCallback((filePath: string, content: string) => {
    setOpenFiles((prev) => {
      const next = new Map(prev);
      const file = next.get(filePath);
      if (file) {
        file.content = content;
        file.isDirty = content !== file.originalContent;
      }
      return next;
    });
  }, []);

  const getActiveFile = useCallback((): OpenFile | null => {
    if (!activeFilePath) return null;
    return openFiles.get(activeFilePath) || null;
  }, [activeFilePath, openFiles]);

  return {
    openFiles,
    activeFilePath,
    openFileForEditing,
    closeFile,
    switchFile,
    saveFile,
    updateFileContent,
    getActiveFile,
  };
};
