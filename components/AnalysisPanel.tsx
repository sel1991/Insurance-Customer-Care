
import React from 'react';
import Spinner from './Spinner';

interface AnalysisPanelProps {
  title: string;
  icon: React.ReactNode;
  isLoading: boolean;
  children: React.ReactNode;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ title, icon, isLoading, children }) => {
  return (
    <div className="bg-surface-card rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center mb-4">
        {icon}
        <h2 className="text-xl font-bold text-text-primary ml-3">{title}</h2>
      </div>
      <div className="flex-grow min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-y-auto h-full pr-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
