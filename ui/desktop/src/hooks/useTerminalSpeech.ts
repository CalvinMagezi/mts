import { useState, useCallback, useEffect, useRef } from 'react';
import { useWhisper } from './useWhisper';
import { toastError } from '../toasts';

interface UseTerminalSpeechOptions {
  terminalId: string | null;
  onSendToTerminal: (terminalId: string, text: string) => void;
}

export const useTerminalSpeech = ({ terminalId, onSendToTerminal }: UseTerminalSpeechOptions) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const previousTerminalIdRef = useRef<string | null>(terminalId);

  // Handle transcription success
  const handleTranscription = useCallback((text: string) => {
    setTranscribedText(text);
    setShowOverlay(true);
    setError(null);
  }, []);

  // Handle transcription errors
  const handleError = useCallback((err: Error) => {
    setError(err.message);
    setShowOverlay(true);
    toastError({
      title: 'Dictation Error',
      msg: err.message,
    });
  }, []);

  // Handle size warnings
  const handleSizeWarning = useCallback((sizeInMB: number) => {
    toastError({
      title: 'Recording Size Warning',
      msg: `Audio file is getting large (${sizeInMB.toFixed(1)}MB). Maximum size is 25MB.`,
    });
  }, []);

  // Initialize useWhisper hook
  const whisper = useWhisper({
    onTranscription: handleTranscription,
    onError: handleError,
    onSizeWarning: handleSizeWarning,
  });

  // Start recording handler
  const handleStartRecording = useCallback(async () => {
    if (!terminalId) {
      toastError({
        title: 'Voice Dictation',
        msg: 'No active terminal',
      });
      return;
    }

    if (!whisper.canUseDictation) {
      toastError({
        title: 'Voice Dictation',
        msg: 'Voice dictation is not configured. Please configure an API key in Settings.',
      });
      return;
    }

    setShowOverlay(true);
    setTranscribedText('');
    setError(null);
    await whisper.startRecording();
  }, [terminalId, whisper]);

  // Stop recording handler
  const handleStopRecording = useCallback(() => {
    whisper.stopRecording();
  }, [whisper]);

  // Send transcribed text to terminal
  const handleSendToTerminal = useCallback(() => {
    if (!terminalId) {
      toastError({
        title: 'Voice Dictation',
        msg: 'No active terminal',
      });
      setShowOverlay(false);
      return;
    }

    if (!transcribedText.trim()) {
      toastError({
        title: 'Voice Dictation',
        msg: 'No text to send',
      });
      return;
    }

    // Send to terminal via callback
    onSendToTerminal(terminalId, transcribedText);

    // Close overlay and reset state
    setShowOverlay(false);
    setTranscribedText('');
    setError(null);
  }, [terminalId, transcribedText, onSendToTerminal]);

  // Cancel and close overlay
  const handleCancel = useCallback(() => {
    // Stop recording if still recording
    if (whisper.isRecording) {
      whisper.stopRecording();
    }

    // Close overlay and reset state
    setShowOverlay(false);
    setTranscribedText('');
    setError(null);
  }, [whisper]);

  // Update transcribed text as user edits
  const handleTextChange = useCallback((text: string) => {
    setTranscribedText(text);
  }, []);

  // Cancel recording if terminal changes
  useEffect(() => {
    // Check if terminal ID actually changed (not just initial mount)
    if (previousTerminalIdRef.current !== null && previousTerminalIdRef.current !== terminalId) {
      if (whisper.isRecording || showOverlay) {
        // Terminal switched during recording - cancel for safety
        handleCancel();
        toastError({
          title: 'Voice Dictation',
          msg: 'Recording cancelled: terminal changed',
        });
      }
    }
    // Update ref for next comparison
    previousTerminalIdRef.current = terminalId;
  }, [terminalId, whisper.isRecording, showOverlay, handleCancel]);

  return {
    // State
    showOverlay,
    transcribedText,
    error,
    isRecording: whisper.isRecording,
    isTranscribing: whisper.isTranscribing,
    canUseDictation: whisper.canUseDictation,
    recordingDuration: whisper.recordingDuration,
    estimatedSize: whisper.estimatedSize,
    audioContext: whisper.audioContext,
    analyser: whisper.analyser,

    // Methods
    handleStartRecording,
    handleStopRecording,
    handleSendToTerminal,
    handleCancel,
    handleTextChange,
  };
};
