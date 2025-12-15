import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TerminalPane } from './TerminalPane';
import { useTerminalContext } from './TerminalContext';

export const TerminalGrid: React.FC = () => {
  const { terminals, activeTerminalId, removeTerminal, setActiveTerminal } = useTerminalContext();

  if (terminals.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <p>No terminals open. Click "New Terminal" to start.</p>
      </div>
    );
  }

  // For single terminal, no split needed
  if (terminals.length === 1) {
    const terminal = terminals[0];
    return (
      <div className="flex-1 p-2">
        <TerminalPane
          terminalId={terminal.id}
          cwd={terminal.cwd}
          shell={terminal.shell}
          onClose={() => removeTerminal(terminal.id)}
          isActive={true}
          onFocus={() => setActiveTerminal(terminal.id)}
        />
      </div>
    );
  }

  // For 2 terminals, horizontal split
  if (terminals.length === 2) {
    return (
      <PanelGroup direction="horizontal" className="flex-1 p-2 gap-1">
        {terminals.map((terminal, index) => (
          <React.Fragment key={terminal.id}>
            {index > 0 && (
              <PanelResizeHandle className="w-1 bg-border-default hover:bg-blue-500 transition-colors rounded" />
            )}
            <Panel minSize={20}>
              <TerminalPane
                terminalId={terminal.id}
                cwd={terminal.cwd}
                shell={terminal.shell}
                onClose={() => removeTerminal(terminal.id)}
                isActive={activeTerminalId === terminal.id}
                onFocus={() => setActiveTerminal(terminal.id)}
              />
            </Panel>
          </React.Fragment>
        ))}
      </PanelGroup>
    );
  }

  // For 3-4 terminals, 2x2 grid
  const topRow = terminals.slice(0, 2);
  const bottomRow = terminals.slice(2, 4);

  return (
    <PanelGroup direction="vertical" className="flex-1 p-2 gap-1">
      <Panel minSize={20}>
        <PanelGroup direction="horizontal" className="h-full gap-1">
          {topRow.map((terminal, index) => (
            <React.Fragment key={terminal.id}>
              {index > 0 && (
                <PanelResizeHandle className="w-1 bg-border-default hover:bg-blue-500 transition-colors rounded" />
              )}
              <Panel minSize={20}>
                <TerminalPane
                  terminalId={terminal.id}
                  cwd={terminal.cwd}
                  shell={terminal.shell}
                  onClose={() => removeTerminal(terminal.id)}
                  isActive={activeTerminalId === terminal.id}
                  onFocus={() => setActiveTerminal(terminal.id)}
                />
              </Panel>
            </React.Fragment>
          ))}
        </PanelGroup>
      </Panel>

      {bottomRow.length > 0 && (
        <>
          <PanelResizeHandle className="h-1 bg-border-default hover:bg-blue-500 transition-colors rounded" />
          <Panel minSize={20}>
            <PanelGroup direction="horizontal" className="h-full gap-1">
              {bottomRow.map((terminal, index) => (
                <React.Fragment key={terminal.id}>
                  {index > 0 && (
                    <PanelResizeHandle className="w-1 bg-border-default hover:bg-blue-500 transition-colors rounded" />
                  )}
                  <Panel minSize={20}>
                    <TerminalPane
                      terminalId={terminal.id}
                      cwd={terminal.cwd}
                      shell={terminal.shell}
                      onClose={() => removeTerminal(terminal.id)}
                      isActive={activeTerminalId === terminal.id}
                      onFocus={() => setActiveTerminal(terminal.id)}
                    />
                  </Panel>
                </React.Fragment>
              ))}
            </PanelGroup>
          </Panel>
        </>
      )}
    </PanelGroup>
  );
};
