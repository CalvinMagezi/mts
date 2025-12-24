import { Trash2, FileText } from 'lucide-react';
import { SavedDiagram } from './useDiagramStorage';

interface DiagramCardProps {
  diagram: SavedDiagram;
  onLoad: () => void;
  onDelete: () => void;
}

export function DiagramCard({ diagram, onLoad, onDelete }: DiagramCardProps) {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onLoad
    onDelete();
  };

  return (
    <div
      className="diagram-card"
      onClick={onLoad}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLoad();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="diagram-card-thumbnail">
        {diagram.thumbnail ? (
          <img
            src={diagram.thumbnail}
            alt={diagram.name}
            loading="lazy"
          />
        ) : (
          <div className="diagram-card-thumbnail-placeholder">
            <FileText className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="diagram-card-info">
        <h4 className="diagram-card-name" title={diagram.name}>
          {diagram.name}
        </h4>
        <div className="diagram-card-meta">
          <span>{diagram.elementCount} elements</span>
          <span>{formatDate(diagram.modifiedAt)}</span>
        </div>
      </div>

      {/* Actions (shown on hover) */}
      <div className="diagram-card-actions">
        <button
          onClick={handleDelete}
          className="diagram-card-action-btn diagram-card-delete-btn"
          title="Delete diagram"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
