import { Sparkles } from 'lucide-react';
import { VoicePromptButton } from './VoicePromptButton';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  showVoiceInput?: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Describe the diagram you want to create...',
  showVoiceInput = false,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleVoiceTranscription = (text: string) => {
    // Append transcribed text to existing prompt
    const newValue = value ? `${value} ${text}` : text;
    onChange(newValue);
  };

  return (
    <div className="canvas-prompt-input">
      <div className="canvas-prompt-icon">
        <Sparkles className="w-4 h-4" />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="canvas-prompt-textarea"
        rows={2}
      />
      {showVoiceInput && (
        <div className="canvas-voice-button">
          <VoicePromptButton
            onTranscription={handleVoiceTranscription}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
