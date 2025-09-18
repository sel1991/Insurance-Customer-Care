import React, { useState, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { TranscriptEntry, AnalysisResult, ProductRecommendation, ClaimDocument, QuoteEligibility, QuoteDetails } from './types';
import { generateAgentResponse, analyzeConversation, recommendProductsForNewCaller, extractClaimDetails, checkClaimEligibility, checkQuoteEligibility, generateQuote } from './services/geminiService';
import CallSimulator from './components/CallSimulator';
import TranscriptPanel from './components/TranscriptPanel';
import AnalysisPanel from './components/AnalysisPanel';
import SentimentPanel from './components/SentimentPanel';
import NotesPanel from './components/NotesPanel';
import QuotePanel from './components/QuotePanel';
import { ClipboardListIcon, LightBulbIcon, SparklesIcon, DocumentTextIcon, DownloadIcon, PaperAirplaneIcon, PencilIcon, CurrencyDollarIcon } from './components/icons';

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
  const [claimDocument, setClaimDocument] = useState<ClaimDocument | null>(null);
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isClaimFiled, setIsClaimFiled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [claimEligibility, setClaimEligibility] = useState({ isAccident: false, hasPolicyNumber: false });
  const [quoteEligibility, setQuoteEligibility] = useState<QuoteEligibility>({ hasName: false, hasDob: false, hasTenure: false });
  const [manualNotes, setManualNotes] = useState<string>('');


  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  const handleStartCall = useCallback(async () => {
    // Reset states for a new call
    setTranscript([]);
    setAnalysis(null);
    setProductRecommendations([]);
    setClaimDocument(null);
    setQuoteDetails(null);
    setIsClaimFiled(false);
    setAudioUrl(null);
    setClaimEligibility({ isAccident: false, hasPolicyNumber: false });
    setQuoteEligibility({ hasName: false, hasDob: false, hasTenure: false });
    setManualNotes('');
    audioChunksRef.current = [];

    try {
      // Get user media and start recording the entire call
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      recorder.start();
      setIsCallActive(true);

      // Start the conversation
      const initialAgentMessage: TranscriptEntry = {
        speaker: 'Agent',
        text: "Thank you for calling Hex General Insurance. My name is Alex. Please be aware that this call may be recorded for safety and quality purposes. How can I help you today?",
      };
      setTranscript([initialAgentMessage]);
      const utterance = new SpeechSynthesisUtterance(initialAgentMessage.text);
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error("Error accessing media devices.", error);
      alert("Could not access camera and microphone. Please check permissions.");
    }
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
        
        const utterance = new SpeechSynthesisUtterance(agentResponseText);
        window.speechSynthesis.speak(utterance);

        setTranscript(prev => [...prev, agentMessage]);
        setIsAgentTyping(false);
      })();
      
      return updatedTranscript;
    });
  }, []);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    if (isRecording) {
        handleStopRecording();
        return;
    }
    
    window.speechSynthesis.cancel();
    
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
    };

    recognition.onend = () => {
         setIsRecording(false);
         if (interimTranscript.trim()) {
            handleUserMessage(interimTranscript.trim());
        }
        setInterimTranscript('');
        recognitionRef.current = null;
    };

    recognition.start();

  }, [isRecording, handleStopRecording, handleUserMessage, interimTranscript]);

  const handleEndCall = useCallback(async () => {
    setIsCallActive(false);
    window.speechSynthesis.cancel();
    
    if (isRecording) {
        handleStopRecording();
    }
    
    // Stop the main call recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    
    // Clean up media stream
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }

    setIsAnalyzing(true);
    setQuoteDetails(null);
    const [analysisResult, eligibilityResult, quoteEligibilityResult] = await Promise.all([
      analyzeConversation(transcript, manualNotes),
      checkClaimEligibility(transcript),
      checkQuoteEligibility(transcript)
    ]);
    setAnalysis(analysisResult);
    setClaimEligibility(eligibilityResult);
    setQuoteEligibility(quoteEligibilityResult);
    setIsAnalyzing(false);
  }, [transcript, isRecording, handleStopRecording, manualNotes]);

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
  
  const handleProcessClaim = useCallback(async () => {
    if (transcript.length < 2) return;
    setIsClaimFiled(false);
    setIsProcessingClaim(true);
    const result = await extractClaimDetails(transcript);
    setClaimDocument(result);
    setIsProcessingClaim(false);
  }, [transcript]);

  const handleFileClaim = useCallback(() => {
    setIsClaimFiled(true);
    // In a real application, this would trigger an API call to a backend system.
  }, []);

  const handleDownloadClaimDocument = useCallback(() => {
    if (!claimDocument) return;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Claim Document: ${claimDocument.claimId || 'N/A'}`, 14, 22);

    doc.setFontSize(12);
    let yPos = 40;

    const addLine = (label: string, value: string | null) => {
      if (yPos > 270) { // Add new page if content overflows
        doc.addPage();
        yPos = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 14, yPos);
      doc.setFont("helvetica", "normal");
      
      const formattedValue = value ?? 'Not mentioned';
      const splitText = doc.splitTextToSize(formattedValue, 120);
      doc.text(splitText, 70, yPos);
      yPos += (splitText.length * 5) + 5;
    };

    addLine('Policyholder Name', claimDocument.policyholderName);
    addLine('Policy Number', claimDocument.policyNumber);
    addLine('Claim Status', claimDocument.claimStatus);
    addLine('Date of Accident', claimDocument.accidentDate);
    
    yPos += 5; // Add some space before the next section
    doc.setFont("helvetica", "bold");
    doc.text("Vehicle Details", 14, yPos);
    yPos += 7;
    addLine('Registration No.', claimDocument.vehicleRegistration);
    addLine('Make', claimDocument.vehicleMake);
    addLine('Model', claimDocument.vehicleModel);
    
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Incident Details", 14, yPos);
    yPos += 7;
    addLine('Description', claimDocument.incidentDescription);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Repair & Servicing", 14, yPos);
    yPos += 7;
    addLine('Assigned Repair Shop', claimDocument.assignedRepairShop);

    doc.save(`claim-document-${claimDocument.claimId || 'new'}.pdf`);
  }, [claimDocument]);
  
    const handleGenerateQuote = useCallback(async () => {
        if (transcript.length < 2) return;
        setIsGeneratingQuote(true);
        try {
            const result = await generateQuote(transcript);
            setQuoteDetails(result);
        } catch (error) {
            console.error("Failed to generate quote", error);
            // Optionally, set some error state to show in the UI
        }
        setIsGeneratingQuote(false);
    }, [transcript]);

    const handleDownloadQuote = useCallback(() => {
        if (!quoteDetails) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Insurance Quote: ${quoteDetails.quoteId}`, 14, 22);
        doc.setFontSize(12);
        doc.text(`Policy Type: ${quoteDetails.policyType}`, 14, 30);


        let yPos = 45;
        const addLine = (label: string, value: string | number | null) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(String(value ?? 'N/A'), 70, yPos);
            yPos += 8;
        };

        doc.setFontSize(14);
        doc.text("Customer Information", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);
        addLine('Customer Name', quoteDetails.customerName);
        addLine('Date of Birth', quoteDetails.dateOfBirth);
        addLine('Policy Tenure', quoteDetails.tenure);

        yPos += 8;
        doc.setFontSize(14);
        doc.text("Premium Details", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);
        addLine('Monthly Premium', `$${quoteDetails.monthlyPremium.toFixed(2)}`);
        addLine('Annual Premium', `$${quoteDetails.annualPremium.toFixed(2)}`);

        yPos += 8;
        doc.setFontSize(14);
        doc.text("Coverage Details", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);
        addLine('Liability', quoteDetails.coverageDetails.liability);
        addLine('Collision', quoteDetails.coverageDetails.collision);
        addLine('Comprehensive', quoteDetails.coverageDetails.comprehensive);


        doc.save(`quote-${quoteDetails.quoteId}.pdf`);
    }, [quoteDetails]);

  const FormRow: React.FC<{ label: string, value: string | null }> = ({ label, value }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
            {label}
        </label>
        <div className="w-full bg-surface-input rounded-md p-3 text-text-primary border border-gray-600 min-h-[2.5rem] flex items-center">
            {value ?? <span className="italic text-gray-400">Not mentioned</span>}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-main text-text-primary font-sans">
      <header className="bg-surface-card/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-center text-text-primary">Hex Agent Assist for Customer Care</h1>
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
            audioUrl={audioUrl}
          />
        </div>

        {/* Right Column: Agent Assist Dashboard */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8 h-[85vh] overflow-y-auto pr-2">
          <div className="md:col-span-3">
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
          <div className="md:col-span-1">
            <NotesPanel
                notes={manualNotes}
                onNotesChange={setManualNotes}
                isCallActive={isCallActive}
            />
          </div>
           <div className="md:col-span-3">
            <AnalysisPanel
              title="Claim Assistant"
              icon={<DocumentTextIcon className="w-7 h-7 text-text-secondary" />}
              isLoading={isProcessingClaim}
            >
              {claimDocument ? (
                <div>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-600 rounded-lg">
                        <h3 className="text-lg font-semibold text-text-accent mb-4">
                            Claim Document: {claimDocument.claimId}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormRow label="Policyholder Name" value={claimDocument.policyholderName} />
                            <FormRow label="Policy Number" value={claimDocument.policyNumber} />
                            <FormRow label="Claim Status" value={claimDocument.claimStatus} />
                            <FormRow label="Date of Accident" value={claimDocument.accidentDate} />
                        </div>
                    </div>
                     <div className="p-4 border border-gray-600 rounded-lg">
                        <h3 className="text-lg font-semibold text-text-accent mb-4">Vehicle Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <FormRow label="Registration No." value={claimDocument.vehicleRegistration} />
                             <FormRow label="Make" value={claimDocument.vehicleMake} />
                             <FormRow label="Model" value={claimDocument.vehicleModel} />
                        </div>
                    </div>
                     <div className="p-4 border border-gray-600 rounded-lg">
                        <h3 className="text-lg font-semibold text-text-accent mb-4">Incident & Repair</h3>
                         <FormRow label="Incident Description" value={claimDocument.incidentDescription} />
                         <div className="mt-4">
                            <FormRow label="Assigned Repair Shop" value={claimDocument.assignedRepairShop} />
                         </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    {isClaimFiled ? (
                      <div className="text-center">
                        <p className="text-green-400 font-bold mb-4">Claim Filed Successfully!</p>
                        <button
                          onClick={handleDownloadClaimDocument}
                          className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                          <DownloadIcon className="w-5 h-5 mr-2" />
                          Download Claim Document
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={handleFileClaim}
                          className="flex-1 flex items-center justify-center bg-brand-secondary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                          <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                          File Claim
                        </button>
                        <button
                          onClick={handleDownloadClaimDocument}
                          className="flex-1 flex items-center justify-center bg-surface-input hover:bg-gray-600 text-text-secondary font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                          <DownloadIcon className="w-5 h-5 mr-2" />
                          Download Claim Document
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-text-secondary mb-4">
                    Extract and pre-fill accident claim details from the conversation.
                  </p>
                  <button
                    onClick={handleProcessClaim}
                    disabled={isCallActive || !claimEligibility.isAccident || !claimEligibility.hasPolicyNumber}
                    className="bg-brand-secondary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Process Accident Claim
                  </button>
                  {!isCallActive && transcript.length > 1 && (!claimEligibility.isAccident || !claimEligibility.hasPolicyNumber) && (
                      <p className="text-xs text-yellow-400 mt-2 max-w-xs">
                          Button is disabled because the conversation is not recognized as an accident report or a policy number was not provided.
                      </p>
                  )}
                </div>
              )}
            </AnalysisPanel>
          </div>
          <div className="md:col-span-3">
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
           <div className="md:col-span-3">
              <QuotePanel
                  eligibility={quoteEligibility}
                  quote={quoteDetails}
                  isGenerating={isGeneratingQuote}
                  onGenerateQuote={handleGenerateQuote}
                  onDownloadQuote={handleDownloadQuote}
                  isCallActive={isCallActive}
              />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;