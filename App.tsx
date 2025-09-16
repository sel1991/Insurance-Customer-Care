import React, { useState, useCallback, useRef } from 'react';
import { TranscriptEntry, AnalysisResult, ProductRecommendation, AccidentClaimDetails } from './types';
import { generateAgentResponse, analyzeConversation, recommendProductsForNewCaller, processAccidentClaim } from './services/geminiService';
import CallSimulator from './components/CallSimulator';
import TranscriptPanel from './components/TranscriptPanel';
import AnalysisPanel from './components/AnalysisPanel';
import SentimentPanel from './components/SentimentPanel';
import { ClipboardListIcon, LightBulbIcon, SparklesIcon, DocumentTextIcon } from './components/icons';

// FIX: Add necessary type definitions for the Web Speech API.
// This avoids installing @types/dom-speech-recognition and fixes TypeScript errors.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};


// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [productRecommendations, setProductRecommendations] = useState<ProductRecommendation[]>([]);
  const [accidentClaimDetails, setAccidentClaimDetails] = useState<AccidentClaimDetails | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);


  const handleStartCall = useCallback(() => {
    const initialAgentMessage: TranscriptEntry = {
      speaker: 'Agent',
      text: "Thank you for calling ABC General Insurance. My name is Alex. How can I help you today?",
    };
    setTranscript([initialAgentMessage]);
    setAnalysis(null);
    setProductRecommendations([]);
    setAccidentClaimDetails(null);
    setIsCallActive(true);
  }, []);

  const handleUserMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    const customerMessage: TranscriptEntry = { speaker: 'Customer', text: message };
    
    setTranscript(prevTranscript => {
      const updatedTranscript = [...prevTranscript, customerMessage];
      
      (async () => {
        setIsAgentTyping(true);
        const agentResponseText = await generateAgentResponse(updatedTranscript);
        const agentMessage: TranscriptEntry = { speaker: 'Agent', text: agentResponseText };
        setTranscript(prev => [...prev, agentMessage]);
        setIsAgentTyping(false);
      })();
      
      return updatedTranscript;
    });
  }, []);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
     if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsRecording(false);

    if (interimTranscript.trim()) {
        handleUserMessage(interimTranscript.trim());
    }
    setInterimTranscript('');
  }, [interimTranscript, handleUserMessage]);

  const handleStartRecording = useCallback(async () => {
    if (isRecording) {
        handleStopRecording();
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionImpl) {
            alert("Speech Recognition API is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognitionImpl();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            setInterimTranscript(interim);
            if (final) {
                handleUserMessage(final.trim());
                setInterimTranscript('');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            handleStopRecording();
        };

        recognition.onend = () => {
            // onend can be triggered by stop() or by browser inactivity.
            // Ensure we clean up if the recognition instance still exists.
            if(recognitionRef.current) {
                handleStopRecording();
            }
        };

        recognition.start();

    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Could not access camera and microphone. Please check permissions.");
    }
  }, [isRecording, handleStopRecording, handleUserMessage]);

  const handleEndCall = useCallback(async () => {
    setIsCallActive(false);
    if (isRecording) {
        handleStopRecording();
    }
    setIsAnalyzing(true);
    const result = await analyzeConversation(transcript);
    setAnalysis(result);
    setIsAnalyzing(false);
  }, [transcript, isRecording, handleStopRecording]);

  const handleDetectAndRecommend = useCallback(async () => {
    if (transcript.length < 2) {
      console.log("Not enough transcript to analyze for product recommendations.");
      return;
    }
    setIsRecommending(true);
    setProductRecommendations([]);
    const result = await recommendProductsForNewCaller(transcript);
    setProductRecommendations(result);
    setIsRecommending(false);
  }, [transcript]);
  
  const handleProcessAccidentClaim = useCallback(async () => {
    if (transcript.length < 2) return;
    setIsProcessingClaim(true);
    const result = await processAccidentClaim(transcript);
    setAccidentClaimDetails(result);
    setIsProcessingClaim(false);
  }, [transcript]);

  return (
    <div className="min-h-screen bg-surface-main text-text-primary font-sans">
      <header className="bg-surface-card/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-center text-text-primary">Gemini Agent Assist</h1>
      </header>
      <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Call Simulation */}
        <div className="lg:col-span-2 bg-surface-card rounded-xl shadow-lg flex flex-col h-[85vh]">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-center">Call Simulator</h2>
          </div>
          <TranscriptPanel 
            transcript={transcript} 
            isAgentTyping={isAgentTyping}
            interimTranscript={interimTranscript}
          />
          <CallSimulator
            isCallActive={isCallActive}
            isAgentTyping={isAgentTyping}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            videoRef={videoRef}
          />
        </div>

        {/* Right Column: Agent Assist Dashboard */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 h-[85vh] overflow-y-auto pr-2">
          <div className="md:col-span-2">
            <AnalysisPanel
              title="Call Summary"
              icon={<ClipboardListIcon className="w-7 h-7 text-text-secondary" />}
              isLoading={isAnalyzing}
            >
              <p className="text-text-secondary">
                {analysis?.summary ?? "Analysis will appear here after the call."}
              </p>
            </AnalysisPanel>
          </div>
          <div className="md:col-span-1">
             <SentimentPanel sentiment={analysis?.sentiment ?? null} isLoading={isAnalyzing} />
          </div>
          <div className="md:col-span-1">
            <AnalysisPanel
              title="Next-Best Actions"
              icon={<LightBulbIcon className="w-7 h-7 text-text-secondary" />}
              isLoading={isAnalyzing}
            >
              {analysis?.nextActions && analysis.nextActions.length > 0 ? (
                <ul className="space-y-3">
                  {analysis.nextActions.map((action, index) => (
                    <li key={index} className="bg-surface-input p-3 rounded-lg text-text-secondary text-sm">
                      {action}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary">
                    Suggestions will appear here.
                </div>
              )}
            </AnalysisPanel>
          </div>
           <div className="md:col-span-2">
            <AnalysisPanel
              title="Claim Assistant"
              icon={<DocumentTextIcon className="w-7 h-7 text-text-secondary" />}
              isLoading={isProcessingClaim}
            >
              {accidentClaimDetails ? (
                <dl className="space-y-3 text-sm">
                  {Object.entries(accidentClaimDetails).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 bg-surface-input p-2 rounded-md">
                      <dt className="font-semibold text-text-primary capitalize col-span-1">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="text-text-secondary col-span-2">{Array.isArray(value) ? value.join(', ') : (value ?? <span className="italic">Not mentioned</span>)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-text-secondary mb-4">
                    Extract key details from the conversation to pre-fill an accident claim report.
                  </p>
                  <button
                    onClick={handleProcessAccidentClaim}
                    disabled={!isCallActive || transcript.length < 2 || isProcessingClaim || isAnalyzing}
                    className="bg-brand-secondary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Process Accident Claim
                  </button>
                </div>
              )}
            </AnalysisPanel>
          </div>
          <div className="md:col-span-2">
            <AnalysisPanel
              title="Product Recommendations"
              icon={<SparklesIcon className="w-7 h-7 text-text-secondary" />}
              isLoading={isRecommending}
            >
              {productRecommendations.length > 0 ? (
                <ul className="space-y-4">
                  {productRecommendations.map((rec, index) => (
                    <li key={index} className="bg-surface-input p-4 rounded-lg">
                      <h4 className="font-bold text-text-accent">{rec.productName}</h4>
                      <p className="text-text-secondary text-sm mt-1">{rec.reasoning}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-text-secondary mb-4">
                    Identify the caller's needs and get tailored product suggestions.
                  </p>
                  <button
                    onClick={handleDetectAndRecommend}
                    disabled={!isCallActive || transcript.length < 2 || isRecommending || isAnalyzing}
                    className="bg-brand-secondary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Detect New Caller & Suggest Products
                  </button>
                </div>
              )}
            </AnalysisPanel>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
