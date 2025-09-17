import React from 'react';
import { MicrophoneIcon, PhoneIcon, StopIcon, DownloadIcon } from './icons';

interface CallSimulatorProps {
  isCallActive: boolean;
  isAgentTyping: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  audioUrl: string | null;
}

const CallSimulator: React.FC<CallSimulatorProps> = ({
  isCallActive,
  isAgentTyping,
  onStartCall,
  onEndCall,
  isRecording,
  onStartRecording,
  onStopRecording,
  videoRef,
  audioUrl,
}) => {
  if (!isCallActive) {
    return (
      <div className="p-4">
        <button
          onClick={onStartCall}
          className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          <PhoneIcon className="w-6 h-6 mr-2" />
          {audioUrl ? 'Start New Call' : 'Start Call'}
        </button>
        {audioUrl && (
          <div className="mt-4">
            <a
              href={audioUrl}
              download="call-recording.webm"
              className="w-full flex items-center justify-center bg-surface-input hover:bg-gray-600 text-text-secondary font-bold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <DownloadIcon className="w-6 h-6 mr-2" />
              Download Recording
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-700 flex flex-col justify-between h-full">
      <div className="flex-grow flex items-center justify-center bg-black rounded-lg mb-4 overflow-hidden min-h-0">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"></video>
      </div>
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={onStartRecording}
              className="flex flex-col items-center justify-center bg-brand-secondary hover:bg-blue-700 text-white font-bold p-4 rounded-full transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
              aria-label="Start recording"
              disabled={isAgentTyping}
            >
              <MicrophoneIcon className="w-8 h-8" />
            </button>
          ) : (
            <button
              onClick={onStopRecording}
              className="flex flex-col items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold p-4 rounded-full transition-colors duration-200 relative"
              aria-label="Stop recording"
            >
              <span className="absolute top-0 right-0 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-400 border-2 border-surface-card"></span>
              </span>
              <StopIcon className="w-8 h-8" />
            </button>
          )}
        </div>
        <button
          onClick={onEndCall}
          className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallSimulator;