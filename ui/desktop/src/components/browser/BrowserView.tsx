import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe, StopCircle } from 'lucide-react';
import { useBrowserAgent } from '../../contexts/BrowserAgentContext';

export default function BrowserView() {
  const {
    state,
    navigate: contextNavigate,
    goBack,
    goForward,
    reload,
    stop,
    canGoBack,
    canGoForward
  } = useBrowserAgent();

  const [inputValue, setInputValue] = useState(state.currentUrl);

  // Update input when URL changes from context
  useEffect(() => {
    setInputValue(state.currentUrl);
  }, [state.currentUrl]);

  const navigate = () => {
    contextNavigate(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-default w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border-default bg-background-muted">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="p-1 hover:bg-background-medium rounded text-text-default disabled:opacity-40 disabled:cursor-not-allowed"
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="p-1 hover:bg-background-medium rounded text-text-default disabled:opacity-40 disabled:cursor-not-allowed"
          title="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        {state.isLoading ? (
          <button
            onClick={stop}
            className="p-1 hover:bg-background-medium rounded text-text-default"
            title="Stop loading"
          >
            <StopCircle className="w-4 h-4 text-red-500" />
          </button>
        ) : (
          <button
            onClick={reload}
            className="p-1 hover:bg-background-medium rounded text-text-default"
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 flex items-center bg-background-input border border-border-input rounded px-2 h-8">
          <Globe className="w-4 h-4 text-text-subtle mr-2" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-text-default text-sm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL..."
          />
        </div>

        {/* Connection status indicator */}
        <div
          className={`px-2 py-1 rounded text-xs ${
            state.connectionStatus === 'connected'
              ? 'bg-green-500/20 text-green-400'
              : state.connectionStatus === 'reconnecting'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}
          title={`WebSocket: ${state.connectionStatus}`}
        >
          {state.connectionStatus === 'connected' && '●'}
          {state.connectionStatus === 'reconnecting' && '○'}
          {state.connectionStatus === 'disconnected' && '✕'}
        </div>
      </div>

      {/* Browser Content - The webview is now managed by BrowserAgentProvider */}
      {/* When visible, it's positioned over this area */}
      <div className="flex-1 relative w-full h-full bg-background-default">
        {!state.isVisible && (
          <div className="flex items-center justify-center h-full text-text-subtle">
            <p>Browser view is loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
