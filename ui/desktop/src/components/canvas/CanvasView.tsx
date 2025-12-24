import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Edit3, Plus, ChevronLeft, ChevronRight, Maximize, Minimize, Save, FolderOpen, Sparkles, Box } from 'lucide-react';

// SDK Imports
import { Diagram, ModelEvent } from '@chamuka/drawit';
import { DiagramClient, type DiagramType, type SerializedElement, type DiagramState } from '@chamuka/drawit-sdk';

// Context
import { useModelAndProvider } from '../ModelAndProviderContext';

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

// Local hooks
import { useDiagramGeneration } from './useDiagramGeneration';
import { useDiagramStorage, type SavedDiagram } from './useDiagramStorage';
import { useDragAndDrop } from './useDragAndDrop';

// Local components
import { InteractiveCanvas } from './InteractiveCanvas';
import { PromptInput } from './PromptInput';
import { DiagramTypeSelector } from './DiagramTypeSelector';
import { SavedDiagramsPanel } from './SavedDiagramsPanel';
import { ShapePalette } from './ShapePalette';

import './canvas.css';

/**
 * CanvasView - Main diagramming page for MTS
 *
 * Features:
 * - AI-powered diagram generation
 * - Interactive canvas with zoom, pan, select
 * - Collapsible side panels
 * - File save/load support
 */
export function CanvasView() {
  // Context
  const { getCurrentModelAndProvider } = useModelAndProvider();

  // Provider and model getter for AI generation
  const getProviderAndModel = useMemo(
    () => async () => {
      const result = await getCurrentModelAndProvider();
      return { provider: result.provider, model: result.model };
    },
    [getCurrentModelAndProvider]
  );

  // State
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elements, setElements] = useState<SerializedElement[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [shapePaletteCollapsed, setShapePaletteCollapsed] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');

  // Auto-save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentDiagramPath, setCurrentDiagramPath] = useState<string | null>(null);

  // References
  const diagramRef = useRef<Diagram | null>(null);
  const clientRef = useRef<DiagramClient | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Diagram storage hook
  const {
    savedDiagrams,
    isLoading: isDiagramsLoading,
    error: diagramsError,
    saveDiagram: saveDiagramToFile,
    loadDiagram: loadDiagramFromFile,
    deleteDiagram: deleteDiagramFile,
    refreshDiagrams,
    generateThumbnail,
  } = useDiagramStorage();

  /**
   * Update elements list
   */
  const updateElements = useCallback(() => {
    if (clientRef.current) {
      const els = clientRef.current.getElements();
      setElements(els);
    }
  }, []);

  /**
   * AI diagram generation hook
   */
  const {
    isGenerating: isAIGenerating,
    error: aiError,
    mode: generationMode,
    generate: generateDiagram,
    cancel: cancelGeneration,
  } = useDiagramGeneration({
    client: clientRef.current,
    diagram: diagramRef.current,
    onElementsUpdated: updateElements,
    getProviderAndModel,
  });

  /**
   * Drag-and-drop hook for shape palette
   */
  const { handleShapeDragStart, handleCanvasDrop, handleDragOver } = useDragAndDrop({
    diagram: diagramRef.current,
    client: clientRef.current,
    onNodeAdded: updateElements,
  });

  // Sync generation state
  useEffect(() => {
    setIsGenerating(isAIGenerating);
  }, [isAIGenerating]);

  // Sync AI errors
  useEffect(() => {
    if (aiError) {
      setError(aiError);
    }
  }, [aiError]);

  /**
   * Called when the interactive canvas is ready
   */
  const handleDiagramReady = useCallback((diagram: Diagram) => {
    diagramRef.current = diagram;

    const container = diagram.canvas.parentElement;
    if (!container) {
      console.error('[Canvas] Cannot find diagram container');
      return;
    }

    const client = new DiagramClient({
      mode: 'interactive',
      container,
      width: 800,
      height: 600,
    });

    client.setDiagram(diagram);
    clientRef.current = client;

    setIsReady(true);
    updateElements();

    console.log('[Canvas] Diagram ready');
  }, [updateElements]);

  /**
   * Listen for element changes to update the elements list
   */
  useEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram) return;

    const handleElementsChanged = () => {
      updateElements();
    };

    diagram.model.on(ModelEvent.SelectionChanged, handleElementsChanged);
    return () => {
      diagram.model.off(ModelEvent.SelectionChanged, handleElementsChanged);
    };
  }, [isReady, updateElements]);

  /**
   * Track changes for auto-save
   */
  useEffect(() => {
    if (elements.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [elements]);

  /**
   * Auto-save function
   */
  const handleAutoSave = useCallback(async () => {
    if (!clientRef.current || !diagramRef.current || elements.length === 0) return;

    try {
      const data = clientRef.current.getState();
      const thumbnail = await generateThumbnail(diagramRef.current);

      // Generate name from current path or use date-based name
      const name = currentDiagramPath
        ? currentDiagramPath.split('/').pop()?.replace('.drawit', '') || `diagram-${new Date().toISOString().split('T')[0]}`
        : `diagram-${new Date().toISOString().split('T')[0]}`;

      const savedPath = await saveDiagramToFile(name, data, thumbnail, diagramType);
      setCurrentDiagramPath(savedPath);
      setHasUnsavedChanges(false);

      console.log('[Canvas] Auto-saved diagram to:', savedPath);

      // Refresh saved diagrams list
      await refreshDiagrams();
    } catch (err) {
      console.error('[Canvas] Auto-save failed:', err);
      // Don't show error to user for auto-save failures
    }
  }, [elements, currentDiagramPath, diagramType, generateThumbnail, saveDiagramToFile, refreshDiagrams]);

  /**
   * Auto-save logic with debounce
   */
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    if (hasUnsavedChanges && elements.length > 0 && isReady) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2 second debounce
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [elements, hasUnsavedChanges, isReady, handleAutoSave]);

  /**
   * Manual save function (Cmd+S)
   */
  const handleManualSave = useCallback(async () => {
    if (!clientRef.current || !diagramRef.current || elements.length === 0) return;

    try {
      const data = clientRef.current.getState();
      const thumbnail = await generateThumbnail(diagramRef.current);

      const name = currentDiagramPath
        ? currentDiagramPath.split('/').pop()?.replace('.drawit', '') || `diagram-${new Date().toISOString().split('T')[0]}`
        : `diagram-${new Date().toISOString().split('T')[0]}`;

      const savedPath = await saveDiagramToFile(name, data, thumbnail, diagramType);
      setCurrentDiagramPath(savedPath);
      setHasUnsavedChanges(false);

      console.log('[Canvas] Manually saved diagram to:', savedPath);

      // Refresh saved diagrams list
      await refreshDiagrams();
    } catch (err) {
      console.error('[Canvas] Manual save failed:', err);
      setError('Failed to save diagram');
    }
  }, [elements, currentDiagramPath, diagramType, generateThumbnail, saveDiagramToFile, refreshDiagrams]);

  /**
   * Load saved diagram
   */
  const handleLoadSavedDiagram = useCallback(async (diagram: SavedDiagram) => {
    if (!clientRef.current) return;

    // Confirm if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Load this diagram anyway?');
      if (!confirmed) return;
    }

    try {
      const data = await loadDiagramFromFile(diagram.path);

      // Clear existing elements
      clientRef.current.clear();

      // Load elements
      if (data.elements && data.elements.length > 0) {
        for (const el of data.elements) {
          const props = el.properties as Record<string, unknown>;
          if (el.type === 'node') {
            clientRef.current.addNode({
              id: el.id,
              position: (props.position as { x: number; y: number }) ?? { x: 0, y: 0 },
              size: props.size as { width: number; height: number } | undefined,
              shape: props.shape as 'rectangle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'star' | 'polygon' | 'polyline' | 'line' | 'icon' | undefined,
              text: props.text as string | undefined,
              style: props.style as Record<string, unknown> | undefined,
              angle: props.angle as number | undefined,
              zIndex: props.zIndex as number | undefined,
              metadata: props.metadata as Record<string, unknown> | undefined,
            });
          } else if (el.type === 'edge') {
            clientRef.current.addEdge({
              id: el.id,
              source: props.source as string,
              target: props.target as string,
              position: props.position as { x: number; y: number } | undefined,
              label: props.label as string | undefined,
              style: props.style as Record<string, unknown> | undefined,
              zIndex: props.zIndex as number | undefined,
              points: props.points as Array<{ x: number; y: number }> | undefined,
              metadata: props.metadata as Record<string, unknown> | undefined,
            });
          }
        }
      }

      updateElements();
      setCurrentDiagramPath(diagram.path);
      setHasUnsavedChanges(false);
      setActiveTab('create'); // Switch to create tab

      console.log('[Canvas] Loaded diagram from:', diagram.path);
    } catch (err) {
      console.error('[Canvas] Load failed:', err);
      setError('Failed to load diagram');
    }
  }, [hasUnsavedChanges, loadDiagramFromFile, updateElements]);

  /**
   * Delete saved diagram
   */
  const handleDeleteSavedDiagram = useCallback(async (diagram: SavedDiagram) => {
    const confirmed = window.confirm(`Delete "${diagram.name}"?`);
    if (!confirmed) return;

    try {
      await deleteDiagramFile();
      console.log('[Canvas] Deleted diagram:', diagram.path);
    } catch (err) {
      console.error('[Canvas] Delete failed:', err);
      setError('Failed to delete diagram');
    }
  }, [deleteDiagramFile]);

  /**
   * Create new diagram (clear canvas)
   */
  const handleNewDiagram = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Create new diagram anyway?');
      if (!confirmed) return;
    }

    if (clientRef.current) {
      clientRef.current.clear();
      updateElements();
    }

    setCurrentDiagramPath(null);
    setHasUnsavedChanges(false);
    setPrompt('');
    setError(null);
    setActiveTab('create');

    console.log('[Canvas] Created new diagram');
  }, [hasUnsavedChanges, updateElements]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Panel toggles
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        setLeftPanelCollapsed((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
        e.preventDefault();
        setRightPanelCollapsed((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShapePaletteCollapsed((prev) => !prev);
      }
      if (e.key === 'Escape' && (leftPanelCollapsed || rightPanelCollapsed)) {
        setLeftPanelCollapsed(false);
        setRightPanelCollapsed(false);
      }

      // Save (Cmd+S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }

      // Open saved diagrams (Cmd+O)
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        setActiveTab('saved');
      }

      // New diagram (Cmd+N)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewDiagram();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftPanelCollapsed, rightPanelCollapsed, shapePaletteCollapsed, handleManualSave, handleNewDiagram]);

  const toggleFocusMode = useCallback(() => {
    const isInFocusMode = leftPanelCollapsed && rightPanelCollapsed;
    setLeftPanelCollapsed(!isInFocusMode);
    setRightPanelCollapsed(!isInFocusMode);
  }, [leftPanelCollapsed, rightPanelCollapsed]);

  const isInFocusMode = leftPanelCollapsed && rightPanelCollapsed;

  /**
   * Handle AI diagram generation
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !diagramRef.current || !clientRef.current) return;

    setError(null);

    try {
      await generateDiagram(prompt, diagramType, editMode);
      setPrompt(''); // Clear prompt on success
    } catch (err) {
      // Error is handled by the hook
      console.error('[Canvas] Generation failed:', err);
    }
  }, [prompt, diagramType, editMode, generateDiagram]);

  /**
   * Clear canvas
   */
  const handleClear = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.clear();
      updateElements();
    }
    setError(null);
  }, [updateElements]);

  /**
   * Save diagram to file
   */
  const handleSave = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      const data = clientRef.current.getState();
      const json = JSON.stringify(data, null, 2);

      // Use MTS Electron API for file selection
      if (window.electron?.selectFileOrDirectory && window.electron?.writeFile) {
        const filePath = await window.electron.selectFileOrDirectory();

        if (filePath) {
          // Ensure .drawit extension
          const savePath = filePath.endsWith('.drawit') ? filePath : `${filePath}.drawit`;
          const success = await window.electron.writeFile(savePath, json);
          if (success) {
            console.log('[Canvas] Saved to:', savePath);
          } else {
            setError('Failed to write file');
          }
        }
      } else {
        // Fallback: download as blob
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.drawit';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[Canvas] Save error:', err);
      setError('Failed to save diagram');
    }
  }, []);

  /**
   * Load diagram from file
   */
  const handleLoad = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      if (window.electron?.selectFileOrDirectory && window.electron?.readFile) {
        const filePath = await window.electron.selectFileOrDirectory();

        if (filePath && filePath.endsWith('.drawit')) {
          const result = await window.electron.readFile(filePath);

          if (result.found && result.file) {
            const data: DiagramState = JSON.parse(result.file);
            // Clear existing elements and load new ones
            clientRef.current.clear();
            if (data.elements && data.elements.length > 0) {
              // Convert SerializedElement to DiagramElement format for addElements
              // We need to reconstruct proper element objects from serialized data
              for (const el of data.elements) {
                const props = el.properties as Record<string, unknown>;
                if (el.type === 'node') {
                  clientRef.current.addNode({
                    id: el.id,
                    position: (props.position as { x: number; y: number }) ?? { x: 0, y: 0 },
                    size: props.size as { width: number; height: number } | undefined,
                    shape: props.shape as 'rectangle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'star' | 'polygon' | 'polyline' | 'line' | 'icon' | undefined,
                    text: props.text as string | undefined,
                    style: props.style as Record<string, unknown> | undefined,
                    angle: props.angle as number | undefined,
                    zIndex: props.zIndex as number | undefined,
                    metadata: props.metadata as Record<string, unknown> | undefined,
                  });
                } else if (el.type === 'edge') {
                  clientRef.current.addEdge({
                    id: el.id,
                    source: props.source as string,
                    target: props.target as string,
                    position: props.position as { x: number; y: number } | undefined,
                    label: props.label as string | undefined,
                    style: props.style as Record<string, unknown> | undefined,
                    zIndex: props.zIndex as number | undefined,
                    points: props.points as Array<{ x: number; y: number }> | undefined,
                    metadata: props.metadata as Record<string, unknown> | undefined,
                  });
                }
              }
            }
            updateElements();
            console.log('[Canvas] Loaded from:', filePath);
          } else {
            setError(result.error || 'File not found');
          }
        } else if (filePath) {
          setError('Please select a .drawit file');
        }
      }
    } catch (err) {
      console.error('[Canvas] Load error:', err);
      setError('Failed to load diagram');
    }
  }, [updateElements]);

  return (
    <div className="canvas-view">
      {/* Header */}
      <header className="canvas-header">
        <div className="canvas-header-title">
          <div className="canvas-logo">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h1 className="canvas-title">Canvas</h1>
            <p className="canvas-subtitle">AI-Powered Diagram Editor</p>
          </div>
        </div>

        <div className="canvas-header-controls">
          <span className={`canvas-badge ${isReady ? 'canvas-badge-success' : ''}`}>
            {isReady ? '● Ready' : '○ Loading...'}
          </span>

          <span
            className={`canvas-badge ${generationMode === 'ai' ? 'canvas-badge-ai' : 'canvas-badge-demo'}`}
            title={generationMode === 'ai' ? 'Using MTS AI for generation' : 'Using demo mode (AI not available)'}
          >
            {generationMode === 'ai' ? (
              <>
                <Sparkles className="w-3 h-3" />
                AI
              </>
            ) : (
              <>
                <Box className="w-3 h-3" />
                Demo
              </>
            )}
          </span>

          <button onClick={handleLoad} className="canvas-btn canvas-btn-secondary" title="Open file">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={handleSave} className="canvas-btn canvas-btn-secondary" title="Save file">
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFocusMode}
            className={`canvas-btn ${isInFocusMode ? 'canvas-btn-primary' : 'canvas-btn-secondary'}`}
            title={isInFocusMode ? 'Exit focus mode' : 'Focus mode'}
          >
            {isInFocusMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="canvas-content">
        {/* Left Panel - Only shown in Create tab */}
        {activeTab === 'create' && (
          <div className={`canvas-panel-left ${leftPanelCollapsed ? 'collapsed' : ''}`}>
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="canvas-panel-toggle canvas-panel-toggle-right"
              title={leftPanelCollapsed ? 'Expand' : 'Collapse'}
            >
              {leftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {!leftPanelCollapsed && (
              <div className="canvas-panel-content">
                <h3 className="canvas-panel-title">Diagram Types</h3>
                <DiagramTypeSelector value={diagramType} onChange={setDiagramType} disabled={isGenerating} />
              </div>
            )}
          </div>
        )}

        {/* Shape Palette - Only shown in Create tab */}
        {activeTab === 'create' && (
          <ShapePalette
            collapsed={shapePaletteCollapsed}
            onToggle={() => setShapePaletteCollapsed(!shapePaletteCollapsed)}
            onShapeDragStart={handleShapeDragStart}
          />
        )}

        {/* Center - Tabs */}
        <div className="canvas-center">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'saved')} className="canvas-tabs">
            <TabsList className="canvas-tabs-list">
              <TabsTrigger value="create" className="canvas-tab-trigger">
                Create Diagram
              </TabsTrigger>
              <TabsTrigger value="saved" className="canvas-tab-trigger">
                Saved Diagrams
                {savedDiagrams.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-background-muted rounded">
                    {savedDiagrams.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Create Diagram Tab */}
            <TabsContent value="create" className="flex-1 flex flex-col min-h-0 m-0">
              {/* Generation Controls */}
              <div className="canvas-generation-controls">
                <div className="canvas-prompt-row">
                  <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    onSubmit={handleGenerate}
                    disabled={isGenerating || !isReady}
                    placeholder={
                      editMode
                        ? 'Describe what to add or change...'
                        : 'Describe the diagram you want to create...'
                    }
                    showVoiceInput={true}
                  />
                </div>

                <div className="canvas-mode-toggle">
                  <button
                    onClick={() => setEditMode(false)}
                    disabled={isGenerating}
                    className={`canvas-mode-btn ${!editMode ? 'active' : ''}`}
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    disabled={isGenerating || elements.length === 0}
                    className={`canvas-mode-btn ${editMode ? 'active' : ''}`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>

                <div className="canvas-action-buttons">
                  {isGenerating ? (
                    <button
                      onClick={cancelGeneration}
                      className="canvas-btn canvas-btn-danger"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || !isReady}
                      className="canvas-btn canvas-btn-primary"
                    >
                      {editMode ? 'Add to Diagram' : 'Generate'}
                    </button>
                  )}
                  <button onClick={handleClear} disabled={isGenerating} className="canvas-btn canvas-btn-secondary">
                    Clear
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="canvas-error">
                  <p>{error}</p>
                </div>
              )}

              {/* Interactive Canvas */}
              <div
                className="canvas-container"
                onDrop={handleCanvasDrop}
                onDragOver={handleDragOver}
              >
                <InteractiveCanvas
                  isGenerating={isGenerating}
                  onDiagramReady={handleDiagramReady}
                />
              </div>
            </TabsContent>

            {/* Saved Diagrams Tab */}
            <TabsContent value="saved" className="flex-1 min-h-0 m-0 overflow-hidden">
              <SavedDiagramsPanel
                diagrams={savedDiagrams}
                onLoadDiagram={handleLoadSavedDiagram}
                onDeleteDiagram={handleDeleteSavedDiagram}
                isLoading={isDiagramsLoading}
                error={diagramsError}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Only shown in Create tab */}
        {activeTab === 'create' && (
          <div className={`canvas-panel-right ${rightPanelCollapsed ? 'collapsed' : ''}`}>
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="canvas-panel-toggle canvas-panel-toggle-left"
              title={rightPanelCollapsed ? 'Expand' : 'Collapse'}
            >
              {rightPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {!rightPanelCollapsed && (
              <div className="canvas-panel-content">
                <h3 className="canvas-panel-title">Elements</h3>
                <div className="canvas-element-list">
                  {elements.length === 0 ? (
                    <p className="canvas-empty-message">No elements yet</p>
                  ) : (
                    <ul>
                      {elements.map((el) => (
                        <li key={el.id} className="canvas-element-item">
                          <span className="canvas-element-type">{el.type}</span>
                          <span className="canvas-element-id">{el.id.slice(0, 8)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CanvasView;
