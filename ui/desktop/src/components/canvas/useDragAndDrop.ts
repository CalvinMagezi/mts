import { useState, useCallback } from 'react';
import { Diagram } from '@chamuka/drawit';
import { DiagramClient } from '@chamuka/drawit-sdk';
import { ShapeDefinition } from './ShapePalette';

interface UseDragAndDropOptions {
  diagram: Diagram | null;
  client: DiagramClient | null;
  onNodeAdded?: () => void;
}

export function useDragAndDrop({ diagram, client, onNodeAdded }: UseDragAndDropOptions) {
  const [draggedShape, setDraggedShape] = useState<ShapeDefinition | null>(null);

  const handleShapeDragStart = useCallback((shape: ShapeDefinition) => {
    setDraggedShape(shape);
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedShape || !client || !diagram) return;

      try {
        const canvasElement = diagram.canvas;
        if (!canvasElement) return;

        const canvasRect = canvasElement.getBoundingClientRect();
        const viewportX = e.clientX - canvasRect.left;
        const viewportY = e.clientY - canvasRect.top;

        // Transform viewport coordinates to diagram world coordinates
        // Account for any zoom and pan transformations
        const zoom = diagram.getZoom();
        const pan = diagram.getPan();

        const worldX = (viewportX - pan.x) / zoom;
        const worldY = (viewportY - pan.y) / zoom;

        const centerX = worldX - draggedShape.defaultSize.width / 2;
        const centerY = worldY - draggedShape.defaultSize.height / 2;

        client.addNode({
          position: { x: centerX, y: centerY },
          size: draggedShape.defaultSize,
          shape: draggedShape.shape,
          text: draggedShape.name,
          style: {
            fillStyle: '#12141A',
            strokeStyle: '#1DE52F',
            lineWidth: 2,
          },
        });

        setDraggedShape(null);
        onNodeAdded?.();
      } catch (error) {
        console.error('Failed to add node:', error);
        setDraggedShape(null);
      }
    },
    [draggedShape, client, diagram, onNodeAdded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedShape(null);
  }, []);

  return {
    draggedShape,
    handleShapeDragStart,
    handleCanvasDrop,
    handleDragOver,
    handleDragEnd,
  };
}
