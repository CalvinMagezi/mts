import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Check } from '../../icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

const HelpText = () => (
  <div className="text-sm flex-col space-y-4 text-textSubtle">
    <p>
      .mtshints is a text file used to provide additional context about your project and improve
      the communication with MTS.
    </p>
    <p>
      Please make sure <span className="font-bold">Developer</span> extension is enabled in the
      extensions page. This extension is required to use .mtshints. You'll need to restart your
      session for .mtshints updates to take effect.
    </p>
    <p>
      See the documentation for more information on using project hints.
    </p>
  </div>
);

const ErrorDisplay = ({ error }: { error: Error }) => (
  <div className="text-sm text-textSubtle">
    <div className="text-red-600">Error reading .mtshints file: {JSON.stringify(error)}</div>
  </div>
);

const FileInfo = ({ filePath, found }: { filePath: string; found: boolean }) => (
  <div className="text-sm font-medium mb-2">
    {found ? (
      <div className="text-green-600">
        <Check className="w-4 h-4 inline-block" /> .mtshints file found at: {filePath}
      </div>
    ) : (
      <div>Creating new .mtshints file at: {filePath}</div>
    )}
  </div>
);

const getMtshintsFile = async (filePath: string) => await window.electron.readFile(filePath);

interface MtshintsModalProps {
  directory: string;
  setIsMtshintsModalOpen: (isOpen: boolean) => void;
}

export const MtshintsModal = ({ directory, setIsMtshintsModalOpen }: MtshintsModalProps) => {
  const mtshintsFilePath = `${directory}/.mtshints`;
  const [mtshintsFile, setMtshintsFile] = useState<string>('');
  const [mtshintsFileFound, setMtshintsFileFound] = useState<boolean>(false);
  const [mtshintsFileReadError, setMtshintsFileReadError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchMtshintsFile = async () => {
      try {
        const { file, error, found } = await getMtshintsFile(mtshintsFilePath);
        setMtshintsFile(file);
        setMtshintsFileFound(found);
        setMtshintsFileReadError(found && error ? error : '');
      } catch (error) {
        console.error('Error fetching .mtshints file:', error);
        setMtshintsFileReadError('Failed to access .mtshints file');
      }
    };
    if (directory) fetchMtshintsFile();
  }, [directory, mtshintsFilePath]);

  const writeFile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await window.electron.writeFile(mtshintsFilePath, mtshintsFile);
      setSaveSuccess(true);
      setMtshintsFileFound(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error writing .mtshints file:', error);
      setMtshintsFileReadError('Failed to save .mtshints file');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => setIsMtshintsModalOpen(open)}>
      <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Project Hints (.mtshints)</DialogTitle>
          <DialogDescription>
            Provide additional context about your project to improve communication with MTS
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pt-2 pb-4">
          <HelpText />

          <div>
            {mtshintsFileReadError ? (
              <ErrorDisplay error={new Error(mtshintsFileReadError)} />
            ) : (
              <div className="space-y-2">
                <FileInfo filePath={mtshintsFilePath} found={mtshintsFileFound} />
                <textarea
                  value={mtshintsFile}
                  className="w-full h-80 border rounded-md p-2 text-sm resize-none bg-background-default text-textStandard border-borderStandard focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(event) => setMtshintsFile(event.target.value)}
                  placeholder="Enter project hints here..."
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {saveSuccess && (
            <span className="text-green-600 text-sm flex items-center gap-1 mr-auto">
              <Check className="w-4 h-4" />
              Saved successfully
            </span>
          )}
          <Button variant="outline" onClick={() => setIsMtshintsModalOpen(false)}>
            Close
          </Button>
          <Button onClick={writeFile} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Backward compatibility alias
export const GoosehintsModal = MtshintsModal;
