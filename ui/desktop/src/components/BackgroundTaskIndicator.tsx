import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveSession } from '../contexts/ActiveSessionContext';

/**
 * A floating indicator that shows when an agent is running in the background.
 * Only visible when not on the chat view.
 */
export function BackgroundTaskIndicator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSession, isAgentRunning } = useActiveSession();

  // Don't show if not running or already on chat view
  if (!isAgentRunning || location.pathname === '/pair') {
    return null;
  }

  const handleClick = () => {
    if (activeSession.sessionId) {
      navigate(`/pair?resumeSessionId=${activeSession.sessionId}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
      title="Click to return to active chat"
    >
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-300"></span>
      </span>
      Agent working...
    </button>
  );
}
