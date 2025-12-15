import React from 'react';
import { Plus, TerminalSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { useTerminalContext } from './TerminalContext';

export const TerminalToolbar: React.FC = () => {
  const { addTerminal, terminals } = useTerminalContext();
  const canAddMore = terminals.length < 4;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-background-default">
      <div className="flex items-center gap-2">
        <TerminalSquare className="w-5 h-5 text-text-default" />
        <h2 className="text-lg font-semibold text-text-default">Terminal Center</h2>
      </div>

      <div className="flex-1" />

      <span className="text-sm text-text-muted">{terminals.length}/4 terminals</span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => addTerminal()}
        disabled={!canAddMore}
        className="gap-1"
      >
        <Plus className="w-4 h-4" />
        New Terminal
      </Button>
    </div>
  );
};
