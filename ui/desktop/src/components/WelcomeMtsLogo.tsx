import { MtsIcon, Rain } from './icons/Mts';

export default function WelcomeMtsLogo({ className = '' }) {
  return (
    <div className={`${className} relative overflow-hidden`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Rain className="w-full h-full scale-[2.5] opacity-0 group-hover/logo:opacity-100 transition-all duration-300 z-1" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <MtsIcon className="w-full h-full z-2" />
      </div>
    </div>
  );
}

// Backward compatibility alias
export const WelcomeGooseLogo = WelcomeMtsLogo;
