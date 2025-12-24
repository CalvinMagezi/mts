import { getDiagramTypes, type DiagramType } from '@chamuka/drawit-sdk';

interface DiagramTypeInfo {
  id: DiagramType;
  name: string;
  icon: string;
  description: string;
}

// Display mapping for diagram types
const DIAGRAM_TYPE_INFO: Record<DiagramType, Omit<DiagramTypeInfo, 'id'>> = {
  flowchart: {
    name: 'Flowchart',
    icon: '📊',
    description: 'Process flows and decision trees',
  },
  architecture: {
    name: 'Architecture',
    icon: '🏗️',
    description: 'System and software architecture diagrams',
  },
  mindmap: {
    name: 'Mind Map',
    icon: '🧠',
    description: 'Brainstorming and idea mapping',
  },
  sequence: {
    name: 'Sequence',
    icon: '↔️',
    description: 'Interaction and sequence diagrams',
  },
  general: {
    name: 'General',
    icon: '📝',
    description: 'General purpose diagrams',
  },
  'org-chart': {
    name: 'Org Chart',
    icon: '👥',
    description: 'Organization hierarchy charts',
  },
  network: {
    name: 'Network',
    icon: '🌐',
    description: 'Network topology diagrams',
  },
  'er-diagram': {
    name: 'ER Diagram',
    icon: '🗄️',
    description: 'Entity relationship diagrams',
  },
};

interface DiagramTypeSelectorProps {
  value: DiagramType;
  onChange: (value: DiagramType) => void;
  disabled?: boolean;
}

export function DiagramTypeSelector({
  value,
  onChange,
  disabled = false,
}: DiagramTypeSelectorProps) {
  const diagramTypes = getDiagramTypes();

  return (
    <div className="canvas-diagram-types">
      {diagramTypes.map((typeId) => {
        const info = DIAGRAM_TYPE_INFO[typeId];
        return (
          <button
            key={typeId}
            onClick={() => onChange(typeId)}
            disabled={disabled}
            className={`canvas-diagram-type-btn ${value === typeId ? 'active' : ''}`}
            title={info.description}
          >
            <span className="canvas-diagram-type-icon">{info.icon}</span>
            <span className="canvas-diagram-type-name">{info.name}</span>
          </button>
        );
      })}
    </div>
  );
}
