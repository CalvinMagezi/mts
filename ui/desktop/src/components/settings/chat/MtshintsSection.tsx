import { useState } from 'react';
import { Button } from '../../ui/button';
import { FolderKey } from 'lucide-react';
import { MtshintsModal } from './MtshintsModal';

export const MtshintsSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const directory = window.appConfig?.get('MTS_WORKING_DIR') as string;

  return (
    <>
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex-1">
          <h3 className="text-text-default">Project Hints (.mtshints)</h3>
          <p className="text-xs text-text-muted mt-[2px]">
            Configure your project's .mtshints file to provide additional context to MTS
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <FolderKey size={16} />
          Configure
        </Button>
      </div>
      {isModalOpen && (
        <MtshintsModal directory={directory} setIsMtshintsModalOpen={setIsModalOpen} />
      )}
    </>
  );
};

// Backward compatibility alias
export const GoosehintsSection = MtshintsSection;
