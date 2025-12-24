import { useRef, useState, useEffect, useCallback } from 'react';
import { Diagram, InteractionMode } from '@chamuka/drawit';
import { ZoomIn, ZoomOut, Maximize2, Move, MousePointer, Link2, Loader2 } from 'lucide-react';
import { useResizeObserver } from '../../hooks/useResizeObserver';

interface InteractiveCanvasProps {
  isGenerating?: boolean;
  onDiagramReady?: (diagram: Diagram) => void;
  className?: string;
}

export function InteractiveCanvas({
  isGenerating = false,
  onDiagramReady,
  className = '',
}: InteractiveCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<Diagram | null>(null);
  const [elementCount, setElementCount] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isConnectMode, setIsConnectMode] = useState(false);

  const onDiagramReadyRef = useRef(onDiagramReady);

  useEffect(() => {
    onDiagramReadyRef.current = onDiagramReady;
  }, [onDiagramReady]);

  // Get initial dimensions from container
  const getContainerDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      width: Math.max(rect.width, 400),
      height: Math.max(rect.height, 400),
    };
  }, []);

  // Initialize diagram (only once)
  useEffect(() => {
    if (!containerRef.current) return;

    const dims = getContainerDimensions();

    const diagram = new Diagram(containerRef.current, {
      width: dims.width,
      height: dims.height,
      background: '#0D0F10',
      gridSize: 20,
      snapToGrid: true,
      enableSelection: true,
      enableDragging: true,
      enableZoom: true,
      enablePan: true,
      enableInlineTextEditing: true,
    });

    diagram.setInteractionMode(InteractionMode.Default);
    diagramRef.current = diagram;
    setIsPanMode(false);

    onDiagramReadyRef.current?.(diagram);

    const updateCount = () => {
      if (diagramRef.current) {
        const elements = diagramRef.current.model.getElements();
        setElementCount(elements.length);
      }
    };

    const interval = setInterval(updateCount, 500);

    return () => {
      clearInterval(interval);
      diagram.dispose();
      diagramRef.current = null;
    };
  }, [getContainerDimensions]);

  // Handle container resize
  useResizeObserver<HTMLDivElement>(
    containerRef,
    useCallback((entry) => {
      const diagram = diagramRef.current;
      if (!diagram) return;

      const { width, height } = entry.contentRect;
      const newWidth = Math.max(width, 400);
      const newHeight = Math.max(height, 400);

      // Note: The Diagram library may not support dynamic resizing
      // The canvas will resize via CSS, and diagram content will scale accordingly
      console.log('Canvas resized:', { width: newWidth, height: newHeight });
    }, [])
  );

  const handleZoomIn = useCallback(() => {
    if (diagramRef.current) {
      const currentZoom = diagramRef.current.getZoom();
      diagramRef.current.zoomAtCenter(currentZoom * 1.2);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (diagramRef.current) {
      const currentZoom = diagramRef.current.getZoom();
      diagramRef.current.zoomAtCenter(currentZoom / 1.2);
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    diagramRef.current?.zoomToFit();
  }, []);

  const handleToggleMode = useCallback(() => {
    if (diagramRef.current) {
      const newMode = isPanMode ? InteractionMode.Default : InteractionMode.Pan;
      diagramRef.current.setInteractionMode(newMode);
      setIsPanMode(!isPanMode);
      if (!isPanMode && isConnectMode) {
        diagramRef.current.interactionManager.setIsConnectionModeActive(false);
        setIsConnectMode(false);
      }
    }
  }, [isPanMode, isConnectMode]);

  const handleToggleConnectMode = useCallback(() => {
    if (diagramRef.current) {
      const newIsConnectMode = !isConnectMode;
      diagramRef.current.interactionManager.setIsConnectionModeActive(newIsConnectMode);
      setIsConnectMode(newIsConnectMode);
      if (newIsConnectMode && isPanMode) {
        diagramRef.current.setInteractionMode(InteractionMode.Default);
        setIsPanMode(false);
      }
    }
  }, [isConnectMode, isPanMode]);

  return (
    <div className={`canvas-interactive ${className}`}>
      <div
        ref={containerRef}
        className="canvas-interactive-container"
      />

      {isGenerating && (
        <div className="canvas-loading-overlay">
          <div className="canvas-loading-content">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating...</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="canvas-controls">
        <button
          onClick={handleToggleConnectMode}
          className={`canvas-control-btn ${isConnectMode ? 'active' : ''}`}
          title={isConnectMode ? 'Exit Connect mode' : 'Connect nodes'}
        >
          <Link2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleToggleMode}
          className={`canvas-control-btn ${isPanMode ? 'active' : ''}`}
          title={isPanMode ? 'Select mode' : 'Pan mode'}
        >
          {isPanMode ? <MousePointer className="w-4 h-4" /> : <Move className="w-4 h-4" />}
        </button>

        <div className="canvas-control-divider" />

        <button onClick={handleZoomIn} className="canvas-control-btn" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} className="canvas-control-btn" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleZoomFit} className="canvas-control-btn" title="Fit to view">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="canvas-status">
        <span className="canvas-status-badge">
          {isPanMode ? 'Pan' : isConnectMode ? 'Connect' : 'Select'}
        </span>
        <span className="canvas-status-count">{elementCount} elements</span>
      </div>
    </div>
  );
}
