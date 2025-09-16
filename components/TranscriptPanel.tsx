
import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';
import { UserIcon, BotIcon } from './icons';

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  isAgentTyping: boolean;
  interimTranscript: string;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript, isAgentTyping, interimTranscript }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, isAgentTyping, interimTranscript]);
  
  return (
    <div className="flex-grow p-4 space-y-4 overflow-y-auto" ref={scrollRef}>
      {transcript.map((entry, index) => (
        <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'Customer' ? 'justify-end' : ''}`}>
          {entry.speaker === 'Agent' && (
            <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
                <BotIcon className="w-5 h-5 text-white" />
            </div>
          )}
          <div
            className={`max-w-md p-3 rounded-lg ${
              entry.speaker === 'Customer'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-surface-card text-text-secondary rounded-bl-none'
            }`}
          >
            <p className="text-sm">{entry.text}</p>
          </div>
           {entry.speaker === 'Customer' && (
            <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      ))}
       {interimTranscript && (
        <div className="flex items-start gap-3 justify-end">
           <div
            className="max-w-md p-3 rounded-lg bg-blue-600 text-white rounded-br-none opacity-60"
          >
            <p className="text-sm italic">{interimTranscript}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      {isAgentTyping && (
         <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
                <BotIcon className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-md p-3 rounded-lg bg-surface-card rounded-bl-none">
                 <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-75"></span>
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-150"></span>
                 </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TranscriptPanel;