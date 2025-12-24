import { Mic, MicOff } from 'lucide-react';
import { useWhisper } from '../../hooks/useWhisper';
import { WaveformVisualizer } from '../WaveformVisualizer';
import { useDictationSettings } from '../../hooks/useDictationSettings';

interface VoicePromptButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoicePromptButton({ onTranscription, disabled = false }: VoicePromptButtonProps) {
  const { settings: dictationSettings } = useDictationSettings();

  const {
    isRecording,
    isTranscribing,
    canUseDictation,
    startRecording,
    stopRecording,
    audioContext,
    analyser,
    recordingDuration,
    estimatedSize,
  } = useWhisper({
    onTranscription: (text) => {
      onTranscription(text);
    },
    onError: (error) => {
      console.error('[VoicePromptButton] Error:', error.message);
      // Could add toast notification here
    },
    onSizeWarning: (sizeMB) => {
      console.warn(`[VoicePromptButton] Recording size: ${sizeMB.toFixed(1)}MB`);
    },
  });

  if (!dictationSettings?.enabled || !canUseDictation) {
    return null;
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="canvas-voice-button-container">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`canvas-voice-button ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
        type="button"
      >
        {isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Waveform visualizer during recording */}
      {isRecording && audioContext && analyser && (
        <div className="canvas-waveform-overlay">
          <WaveformVisualizer
            audioContext={audioContext}
            analyser={analyser}
            isRecording={isRecording}
          />
        </div>
      )}

      {/* Recording status */}
      {isRecording && (
        <div className="canvas-recording-status">
          <span className="canvas-recording-dot" />
          <span className="canvas-recording-time">
            {Math.floor(recordingDuration)}s
          </span>
          {estimatedSize > 0 && (
            <span className="canvas-recording-size">
              {estimatedSize.toFixed(1)}MB
            </span>
          )}
        </div>
      )}

      {/* Transcribing status */}
      {isTranscribing && (
        <div className="canvas-transcribing-status">
          Transcribing...
        </div>
      )}
    </div>
  );
}
