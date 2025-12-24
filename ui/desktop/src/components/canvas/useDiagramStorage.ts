import { useState, useCallback, useEffect } from 'react';
import { Diagram } from '@chamuka/drawit';
import { DiagramType, DiagramState } from '@chamuka/drawit-sdk';

export interface SavedDiagram {
  id: string;
  name: string;
  path: string;
  thumbnail: string | null; // base64 data URL
  elementCount: number;
  createdAt: number;
  modifiedAt: number;
}

export interface DiagramMetadata {
  name: string;
  elementCount: number;
  diagramType: DiagramType;
  createdAt: number;
  modifiedAt: number;
}

export interface ExtendedDiagramState extends DiagramState {
  metadata?: DiagramMetadata;
}

interface UseDiagramStorageOptions {
  autoLoad?: boolean;
}

export function useDiagramStorage(options: UseDiagramStorageOptions = {}) {
  const { autoLoad = true } = options;

  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);

  /**
   * Get the diagrams directory path
   */
  const getDiagramsDirectory = useCallback((): string => {
    const workingDir = window.appConfig.get('MTS_WORKING_DIR') as string || process.cwd();
    return `${workingDir}/drawit-diagrams`;
  }, []);

  /**
   * Generate thumbnail from diagram canvas
   */
  const generateThumbnail = useCallback((diagram: Diagram): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = diagram.canvas;
        const thumbCanvas = document.createElement('canvas');
        const ctx = thumbCanvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        const targetWidth = 300;
        const targetHeight = 200;
        const aspectRatio = canvas.width / canvas.height;

        let thumbWidth = targetWidth;
        let thumbHeight = targetWidth / aspectRatio;

        if (thumbHeight > targetHeight) {
          thumbHeight = targetHeight;
          thumbWidth = targetHeight * aspectRatio;
        }

        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;

        // Draw and convert to data URL
        ctx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
        const dataUrl = thumbCanvas.toDataURL('image/png', 0.8);
        resolve(dataUrl);
      } catch (err) {
        console.error('[useDiagramStorage] Thumbnail generation failed:', err);
        reject(err);
      }
    });
  }, []);

  /**
   * Save diagram to file system
   */
  const saveDiagram = useCallback(
    async (name: string, data: DiagramState, thumbnail: string, diagramType: DiagramType): Promise<string> => {
      try {
        const diagramsDir = getDiagramsDirectory();

        // Ensure directory exists
        await window.electron.ensureDirectory(diagramsDir);

        // Add metadata to diagram data
        const now = Date.now();
        const fileData: ExtendedDiagramState = {
          ...data,
          metadata: {
            name,
            elementCount: data.elements.length,
            diagramType,
            createdAt: now,
            modifiedAt: now,
          },
        };

        // Save diagram file
        const filename = `${name}-${now}.drawit`;
        const filepath = `${diagramsDir}/${filename}`;
        await window.electron.writeFile(filepath, JSON.stringify(fileData, null, 2));

        // Save thumbnail
        const thumbPath = `${filepath}.thumb.png`;
        await window.electron.writeFile(thumbPath, thumbnail);

        console.log('[useDiagramStorage] Saved diagram to:', filepath);
        return filepath;
      } catch (err) {
        console.error('[useDiagramStorage] Save failed:', err);
        throw err;
      }
    },
    [getDiagramsDirectory]
  );

  /**
   * Load diagram from file path
   */
  const loadDiagram = useCallback(async (path: string): Promise<ExtendedDiagramState> => {
    try {
      const result = await window.electron.readFile(path);

      if (!result.found || !result.file) {
        throw new Error('Diagram file not found');
      }

      const data: ExtendedDiagramState = JSON.parse(result.file);
      return data;
    } catch (err) {
      console.error('[useDiagramStorage] Load failed:', err);
      throw err;
    }
  }, []);

  /**
   * Load saved diagrams list
   */
  const refreshDiagrams = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const diagramsDir = getDiagramsDirectory();

      // Try to list files (may fail if directory doesn't exist yet)
      let files: string[] = [];
      try {
        files = await window.electron.listFiles(diagramsDir, '.drawit');
      } catch {
        // Directory doesn't exist yet - that's okay
        console.log('[useDiagramStorage] Diagrams directory not found (will be created on first save)');
        setSavedDiagrams([]);
        setIsLoading(false);
        return;
      }

      const diagrams: SavedDiagram[] = [];
      for (const file of files) {
        try {
          const filepath = `${diagramsDir}/${file}`;
          const result = await window.electron.readFile(filepath);

          if (result.found && result.file) {
            const data: ExtendedDiagramState = JSON.parse(result.file);

            // Load thumbnail
            const thumbPath = `${filepath}.thumb.png`;
            const thumbResult = await window.electron.readFile(thumbPath);

            diagrams.push({
              id: file,
              name: data.metadata?.name || file.replace('.drawit', ''),
              path: filepath,
              thumbnail: thumbResult.found ? thumbResult.file : null,
              elementCount: data.elements?.length || 0,
              createdAt: data.metadata?.createdAt || 0,
              modifiedAt: data.metadata?.modifiedAt || 0,
            });
          }
        } catch (err) {
          console.error(`[useDiagramStorage] Failed to load diagram ${file}:`, err);
          // Continue with other files
        }
      }

      // Sort by modified date (newest first)
      diagrams.sort((a, b) => b.modifiedAt - a.modifiedAt);

      setSavedDiagrams(diagrams);
    } catch (err) {
      console.error('[useDiagramStorage] Refresh failed:', err);
      setError('Failed to load saved diagrams');
    } finally {
      setIsLoading(false);
    }
  }, [getDiagramsDirectory]);

  /**
   * Delete diagram files (both .drawit and .thumb.png)
   */
  const deleteDiagram = useCallback(async (): Promise<void> => {
    try {
      // Note: Electron doesn't have deleteFile API exposed, so we'll need to handle this
      // For now, we'll just refresh the list after attempting delete
      console.warn('[useDiagramStorage] Delete not fully implemented - Electron API needed');

      // Refresh diagrams list
      await refreshDiagrams();
    } catch (err) {
      console.error('[useDiagramStorage] Delete failed:', err);
      throw err;
    }
  }, [refreshDiagrams]);

  /**
   * Get current working directory
   */
  useEffect(() => {
    try {
      const dir = window.appConfig.get('MTS_WORKING_DIR') as string || process.cwd();
      setWorkingDirectory(dir);
    } catch (err) {
      console.error('[useDiagramStorage] Failed to get working directory:', err);
    }
  }, []);

  /**
   * Auto-load diagrams on mount if enabled
   */
  useEffect(() => {
    if (autoLoad && workingDirectory) {
      refreshDiagrams();
    }
  }, [autoLoad, workingDirectory, refreshDiagrams]);

  return {
    savedDiagrams,
    isLoading,
    error,
    workingDirectory,
    saveDiagram,
    loadDiagram,
    deleteDiagram,
    refreshDiagrams,
    generateThumbnail,
  };
}
