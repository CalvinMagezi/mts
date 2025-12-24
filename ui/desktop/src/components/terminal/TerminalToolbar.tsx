import React, { useState, useCallback } from 'react';
import { Plus, TerminalSquare, Keyboard, Mic, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useTerminalContext } from './TerminalContext';
import { useTerminalSpeech } from '../../hooks/useTerminalSpeech';
import { TerminalSpeechOverlay } from './TerminalSpeechOverlay';

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const cmdKey = isMac ? '⌘' : 'Ctrl';
const optKey = isMac ? '⌥' : 'Alt';

const shortcuts = [
  { keys: `${cmdKey}+Shift+\\`, action: 'New Terminal' },
  { keys: `${cmdKey}+Shift+E`, action: 'Terminal Center' },
  { keys: `${optKey}+1/2/3/4`, action: 'Switch Terminal' },
  { keys: `${cmdKey}+W`, action: 'Close Terminal' },
  { keys: `${cmdKey}+F`, action: 'Search' },
  { keys: `${cmdKey}+K`, action: 'Clear' },
];

export const TerminalToolbar: React.FC = () => {
  const { addTerminal, terminals, activeTerminalId } = useTerminalContext();
  const canAddMore = terminals.length < 4;
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle sending transcribed text to terminal
  const handleSendToTerminal = useCallback((terminalId: string, text: string) => {
    // Send text to terminal with newline to execute
    window.electron.ptyWrite(terminalId, text + '\n');
  }, []);

  // Initialize speech-to-text functionality
  const speech = useTerminalSpeech({
    terminalId: activeTerminalId,
    onSendToTerminal: handleSendToTerminal,
  });

  // Determine microphone button state
  const getMicrophoneTooltip = () => {
    if (!activeTerminalId) return 'No active terminal';
    if (!speech.canUseDictation) return 'Configure OpenAI API key in Settings to use voice dictation';
    if (speech.isRecording) return 'Stop recording';
    if (speech.isTranscribing) return 'Transcribing...';
    return 'Start voice dictation';
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-background-default">
      <div className="flex items-center gap-2">
        <TerminalSquare className="w-5 h-5 text-text-default" />
        <h2 className="text-lg font-semibold text-text-default">Terminal Center</h2>
      </div>

      <div className="flex-1" />

      {/* Microphone button for voice dictation */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${
          speech.isRecording
            ? 'text-red-500 animate-pulse'
            : 'text-text-muted hover:text-text-default'
        }`}
        onClick={speech.isRecording ? speech.handleStopRecording : speech.handleStartRecording}
        disabled={!speech.canUseDictation || !activeTerminalId || speech.isTranscribing}
        title={getMicrophoneTooltip()}
      >
        {speech.isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {/* Keyboard shortcuts indicator */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-text-muted hover:text-text-default"
          onMouseEnter={() => setShowShortcuts(true)}
          onMouseLeave={() => setShowShortcuts(false)}
          onClick={() => setShowShortcuts(!showShortcuts)}
          title="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        {showShortcuts && (
          <div
            className="absolute right-0 top-full mt-1 z-50 bg-background-default border border-border-default rounded-lg shadow-lg p-3 min-w-[200px]"
            onMouseEnter={() => setShowShortcuts(true)}
            onMouseLeave={() => setShowShortcuts(false)}
          >
            <div className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
              Keyboard Shortcuts
            </div>
            <div className="space-y-1.5">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-default">{shortcut.action}</span>
                  <kbd className="text-xs bg-background-medium px-1.5 py-0.5 rounded border border-border-default text-text-muted font-mono">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

      {/* Speech overlay */}
      {speech.showOverlay && (
        <TerminalSpeechOverlay
          isRecording={speech.isRecording}
          isTranscribing={speech.isTranscribing}
          recordingDuration={speech.recordingDuration}
          estimatedSize={speech.estimatedSize}
          transcribedText={speech.transcribedText}
          error={speech.error}
          onTextChange={speech.handleTextChange}
          onSend={speech.handleSendToTerminal}
          onCancel={speech.handleCancel}
          onStopRecording={speech.handleStopRecording}
          audioContext={speech.audioContext}
          analyser={speech.analyser}
        />
      )}
    </div>
  );
};
