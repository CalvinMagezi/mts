import React from 'react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { TerminalGrid } from './TerminalGrid';
import { TerminalToolbar } from './TerminalToolbar';

const TerminalCenterView: React.FC = () => {
  return (
    <MainPanelLayout backgroundColor="bg-background-muted">
      <div className="flex flex-col h-full">
        <TerminalToolbar />
        <TerminalGrid />
      </div>
    </MainPanelLayout>
  );
};

export default TerminalCenterView;
