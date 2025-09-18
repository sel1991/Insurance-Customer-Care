
import React from 'react';
import AnalysisPanel from './AnalysisPanel';
import { PencilIcon } from './icons';

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  isCallActive: boolean;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ notes, onNotesChange, isCallActive }) => {
  return (
    <AnalysisPanel
      title="Manual Notes"
      icon={<PencilIcon className="w-7 h-7 text-text-secondary" />}
      isLoading={false} // This panel is never in a loading state
    >
      <div className="h-full flex flex-col">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={isCallActive ? "Take notes during the call..." : "Add or edit notes after the call..."}
          className="w-full flex-grow bg-surface-input rounded-md p-3 text-text-primary border border-gray-600 focus:ring-2 focus:ring-brand-secondary focus:outline-none transition resize-none"
          aria-label="Manual notes"
        />
        <p className="text-xs text-text-secondary mt-2">
          These notes will be included in the final call summary.
        </p>
      </div>
    </AnalysisPanel>
  );
};

export default NotesPanel;
