import { Square, Circle, Diamond, Triangle, Hexagon, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

export interface ShapeDefinition {
  id: string;
  name: string;
  shape: 'rectangle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'star';
  icon: ReactNode;
  defaultSize: { width: number; height: number };
  description: string;
}

export const AVAILABLE_SHAPES: ShapeDefinition[] = [
  {
    id: 'rect',
    name: 'Rectangle',
    shape: 'rectangle',
    icon: <Square className="w-5 h-5" />,
    defaultSize: { width: 140, height: 60 },
    description: 'Process, step, or entity',
  },
  {
    id: 'ellipse',
    name: 'Ellipse',
    shape: 'ellipse',
    icon: <Circle className="w-5 h-5" />,
    defaultSize: { width: 120, height: 80 },
    description: 'Start/end point',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    shape: 'diamond',
    icon: <Diamond className="w-5 h-5" />,
    defaultSize: { width: 100, height: 100 },
    description: 'Decision point',
  },
  {
    id: 'triangle',
    name: 'Triangle',
    shape: 'triangle',
    icon: <Triangle className="w-5 h-5" />,
    defaultSize: { width: 100, height: 90 },
    description: 'Warning or alert',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    shape: 'hexagon',
    icon: <Hexagon className="w-5 h-5" />,
    defaultSize: { width: 110, height: 100 },
    description: 'Preparation step',
  },
  {
    id: 'star',
    name: 'Star',
    shape: 'star',
    icon: <Star className="w-5 h-5" />,
    defaultSize: { width: 100, height: 100 },
    description: 'Important item',
  },
];

interface ShapePaletteProps {
  collapsed: boolean;
  onToggle: () => void;
  onShapeDragStart: (shape: ShapeDefinition, event: React.DragEvent) => void;
}

export function ShapePalette({ collapsed, onToggle, onShapeDragStart }: ShapePaletteProps) {
  const handleDragStart = (shape: ShapeDefinition, event: React.DragEvent) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify(shape));
    onShapeDragStart(shape, event);
  };

  return (
    <div className={`canvas-shape-palette ${collapsed ? 'collapsed' : ''}`}>
      <div className="canvas-shape-palette-header">
        {!collapsed && <span className="canvas-shape-palette-title">Shapes</span>}
        <button
          onClick={onToggle}
          className="canvas-shape-palette-toggle"
          title={collapsed ? 'Expand shapes palette' : 'Collapse shapes palette'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="canvas-shape-grid">
          {AVAILABLE_SHAPES.map((shape) => (
            <div
              key={shape.id}
              className="canvas-shape-card"
              draggable
              onDragStart={(e) => handleDragStart(shape, e)}
              title={shape.description}
            >
              <div className="canvas-shape-card-icon">{shape.icon}</div>
              <div className="canvas-shape-card-name">{shape.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
