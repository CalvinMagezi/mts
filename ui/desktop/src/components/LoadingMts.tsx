import MtsLogo from './MtsLogo';
import AnimatedIcons from './AnimatedIcons';
import FlyingBird from './FlyingBird';
import { ChatState } from '../types/chatState';

interface LoadingMtsProps {
  message?: string;
  chatState?: ChatState;
}

const STATE_MESSAGES: Record<ChatState, string> = {
  [ChatState.LoadingConversation]: 'loading conversation...',
  [ChatState.Thinking]: 'MTS is thinking…',
  [ChatState.Streaming]: 'MTS is working on it…',
  [ChatState.WaitingForUserInput]: 'MTS is waiting…',
  [ChatState.Compacting]: 'MTS is compacting the conversation...',
  [ChatState.Idle]: 'MTS is working on it…',
};

const STATE_ICONS: Record<ChatState, React.ReactNode> = {
  [ChatState.LoadingConversation]: <AnimatedIcons className="flex-shrink-0" cycleInterval={600} />,
  [ChatState.Thinking]: <AnimatedIcons className="flex-shrink-0" cycleInterval={600} />,
  [ChatState.Streaming]: <FlyingBird className="flex-shrink-0" cycleInterval={150} />,
  [ChatState.WaitingForUserInput]: (
    <AnimatedIcons className="flex-shrink-0" cycleInterval={600} variant="waiting" />
  ),
  [ChatState.Compacting]: <AnimatedIcons className="flex-shrink-0" cycleInterval={600} />,
  [ChatState.Idle]: <MtsLogo size="small" hover={false} />,
};

const LoadingMts = ({ message, chatState = ChatState.Idle }: LoadingMtsProps) => {
  const displayMessage = message || STATE_MESSAGES[chatState];
  const icon = STATE_ICONS[chatState];

  return (
    <div className="w-full animate-fade-slide-up">
      <div
        data-testid="loading-indicator"
        className="flex items-center gap-2 text-xs text-textStandard py-2"
      >
        {icon}
        {displayMessage}
      </div>
    </div>
  );
};

export default LoadingMts;

// Backward compatibility alias
export const LoadingGoose = LoadingMts;
