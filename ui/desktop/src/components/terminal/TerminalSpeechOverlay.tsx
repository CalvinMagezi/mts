import React, { useEffect, useRef } from 'react';
import { Loader2, Mic, Send, X } from 'lucide-react';
import { Button } from '../ui/button';
import { WaveformVisualizer } from '../WaveformVisualizer';

interface TerminalSpeechOverlayProps {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  estimatedSize: number;
  transcribedText: string;
  error: string | null;
  onTextChange: (text: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onStopRecording: () => void;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

export const TerminalSpeechOverlay: React.FC<TerminalSpeechOverlayProps> = ({
  isRecording,
  isTranscribing,
  recordingDuration,
  estimatedSize,
  transcribedText,
  error,
  onTextChange,
  onSend,
  onCancel,
  onStopRecording,
  audioContext,
  analyser,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Format recording duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && !isRecording && !isTranscribing && transcribedText && !error) {
        e.preventDefault();
        onSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isTranscribing, transcribedText, error, onSend, onCancel]);

  // Auto-focus textarea when transcription completes
  useEffect(() => {
    if (transcribedText && !isTranscribing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(transcribedText.length, transcribedText.length);
    }
  }, [transcribedText, isTranscribing]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        // Close overlay if backdrop is clicked (not the card)
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-background-default border border-border-default rounded-lg shadow-lg p-6 min-w-[400px] max-w-[600px] w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-text-default" />
            <h3 className="text-lg font-semibold text-text-default">Voice Dictation</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-text-muted hover:text-text-default"
            onClick={onCancel}
            title="Cancel (Escape)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Recording State */}
        {isRecording && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-red-500">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>

            {/* Waveform Visualizer */}
            {audioContext && analyser && (
              <div className="h-24 flex items-center justify-center bg-background-medium rounded-lg">
                <WaveformVisualizer audioContext={audioContext} analyser={analyser} isRecording={isRecording} />
              </div>
            )}

            {/* Recording Info */}
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span>Duration: {formatDuration(recordingDuration)}</span>
              <span>Size: {estimatedSize.toFixed(1)} MB</span>
            </div>

            {/* Stop Recording Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={onStopRecording}
            >
              <Mic className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          </div>
        )}

        {/* Transcribing State */}
        {isTranscribing && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Transcribing audio...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isRecording && !isTranscribing && (
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={onCancel}>
              Close
            </Button>
          </div>
        )}

        {/* Editing State */}
        {transcribedText && !isTranscribing && !error && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Review and edit your command:
              </label>
              <textarea
                ref={textareaRef}
                className="w-full min-h-[100px] px-3 py-2 bg-background-medium border border-border-default rounded-lg text-text-default focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical font-mono text-sm"
                value={transcribedText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Transcribed text will appear here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={onSend}
                disabled={!transcribedText.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Terminal
              </Button>
            </div>

            <p className="text-xs text-text-muted text-center">
              Press Enter to send • Escape to cancel
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
