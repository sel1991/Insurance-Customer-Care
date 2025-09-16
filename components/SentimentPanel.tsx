
import React from 'react';
import { Sentiment } from '../types';
import { SmileIcon, MehIcon, FrownIcon } from './icons';
import AnalysisPanel from './AnalysisPanel';

interface SentimentPanelProps {
  sentiment: Sentiment | null;
  isLoading: boolean;
}

const SentimentDisplay: React.FC<{ sentiment: Sentiment }> = ({ sentiment }) => {
  const sentimentConfig = {
    Positive: {
      icon: <SmileIcon className="w-16 h-16 text-green-400" />,
      text: 'Positive',
      textColor: 'text-green-400',
    },
    Negative: {
      icon: <FrownIcon className="w-16 h-16 text-red-400" />,
      text: 'Negative',
      textColor: 'text-red-400',
    },
    Neutral: {
      icon: <MehIcon className="w-16 h-16 text-yellow-400" />,
      text: 'Neutral',
      textColor: 'text-yellow-400',
    },
    Mixed: {
      icon: <MehIcon className="w-16 h-16 text-blue-400" />,
      text: 'Mixed',
      textColor: 'text-blue-400',
    },
  };

  const config = sentimentConfig[sentiment];

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      {config.icon}
      <p className={`text-2xl font-bold ${config.textColor}`}>{config.text}</p>
    </div>
  );
};

const SentimentPanel: React.FC<SentimentPanelProps> = ({ sentiment, isLoading }) => {
    const iconToUse = () => {
        if (!sentiment) return <MehIcon className="w-7 h-7 text-text-secondary" />;
        switch(sentiment) {
            case 'Positive': return <SmileIcon className="w-7 h-7 text-text-secondary" />;
            case 'Negative': return <FrownIcon className="w-7 h-7 text-text-secondary" />;
            default: return <MehIcon className="w-7 h-7 text-text-secondary" />;
        }
    }
  return (
    <AnalysisPanel
      title="Sentiment Analysis"
      icon={iconToUse()}
      isLoading={isLoading}
    >
      {sentiment ? (
        <SentimentDisplay sentiment={sentiment} />
      ) : (
        <div className="flex items-center justify-center h-full text-text-secondary">
            Analysis will appear here after the call.
        </div>
      )}
    </AnalysisPanel>
  );
};

export default SentimentPanel;
