import { FileText, Loader2 } from 'lucide-react';
import { DiagramCard } from './DiagramCard';
import { SavedDiagram } from './useDiagramStorage';

interface SavedDiagramsPanelProps {
  diagrams: SavedDiagram[];
  onLoadDiagram: (diagram: SavedDiagram) => void;
  onDeleteDiagram: (diagram: SavedDiagram) => void;
  isLoading: boolean;
  error: string | null;
}

export function SavedDiagramsPanel({
  diagrams,
  onLoadDiagram,
  onDeleteDiagram,
  isLoading,
  error,
}: SavedDiagramsPanelProps) {
  if (isLoading) {
    return (
      <div className="saved-diagrams-empty">
        <Loader2 className="w-12 h-12 animate-spin text-muted-foreground/50" />
        <h3 className="saved-diagrams-empty-title">Loading diagrams...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved-diagrams-empty">
        <FileText className="saved-diagrams-empty-icon" />
        <h3 className="saved-diagrams-empty-title">Error loading diagrams</h3>
        <p className="saved-diagrams-empty-description">{error}</p>
      </div>
    );
  }

  if (diagrams.length === 0) {
    return (
      <div className="saved-diagrams-empty">
        <FileText className="saved-diagrams-empty-icon" />
        <h3 className="saved-diagrams-empty-title">No saved diagrams</h3>
        <p className="saved-diagrams-empty-description">
          Create your first diagram and it will be automatically saved here
        </p>
      </div>
    );
  }

  return (
    <div className="saved-diagrams-grid">
      {diagrams.map((diagram) => (
        <DiagramCard
          key={diagram.id}
          diagram={diagram}
          onLoad={() => onLoadDiagram(diagram)}
          onDelete={() => onDeleteDiagram(diagram)}
        />
      ))}
    </div>
  );
}
