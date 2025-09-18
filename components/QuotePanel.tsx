import React from 'react';
import AnalysisPanel from './AnalysisPanel';
import { CurrencyDollarIcon, DownloadIcon } from './icons';
import { QuoteEligibility, QuoteDetails } from '../types';

interface QuotePanelProps {
  eligibility: QuoteEligibility;
  quote: QuoteDetails | null;
  isGenerating: boolean;
  onGenerateQuote: () => void;
  onDownloadQuote: () => void;
  isCallActive: boolean;
}

const QuotePanel: React.FC<QuotePanelProps> = ({
  eligibility,
  quote,
  isGenerating,
  onGenerateQuote,
  onDownloadQuote,
  isCallActive
}) => {
  const isEligible = eligibility.hasName && eligibility.hasDob && eligibility.hasTenure;

  const EligibilityChecklist: React.FC = () => {
    const checks = [
      { label: 'Customer Name Provided', checked: eligibility.hasName },
      { label: 'Date of Birth Provided', checked: eligibility.hasDob },
      { label: 'Policy Tenure Provided', checked: eligibility.hasTenure },
    ];
    return (
      <ul className="text-xs text-yellow-400 mt-2 space-y-1">
        {checks.map(check => (
          <li key={check.label} className={`flex items-center ${check.checked ? 'text-green-400' : 'text-yellow-400'}`}>
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              {check.checked ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            {check.label}
          </li>
        ))}
      </ul>
    );
  };

  const QuoteDetailRow: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-surface-input">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary font-semibold">{value}</span>
    </div>
  );

  return (
    <AnalysisPanel
      title="Quote Assistant"
      icon={<CurrencyDollarIcon className="w-7 h-7 text-text-secondary" />}
      isLoading={isGenerating}
    >
      {quote ? (
        <div>
          <div className="bg-surface-input p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-text-accent">{quote.policyType}</h3>
                <p className="text-xs text-text-secondary">Quote ID: {quote.quoteId}</p>
              </div>
              <div className="text-right">
                 <p className="text-xl font-bold text-green-400">${quote.monthlyPremium.toFixed(2)}/mo</p>
                 <p className="text-xs text-text-secondary">${quote.annualPremium.toFixed(2)}/yr</p>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-600 pt-4">
                <QuoteDetailRow label="Customer Name" value={quote.customerName} />
                <QuoteDetailRow label="Date of Birth" value={quote.dateOfBirth} />
                <QuoteDetailRow label="Policy Tenure" value={quote.tenure} />
            </div>
             <div className="mt-4 border-t border-gray-600 pt-4">
                <h4 className="font-semibold text-text-primary mb-2">Coverage Details</h4>
                <QuoteDetailRow label="Liability" value={quote.coverageDetails.liability} />
                <QuoteDetailRow label="Collision" value={quote.coverageDetails.collision} />
                <QuoteDetailRow label="Comprehensive" value={quote.coverageDetails.comprehensive} />
            </div>
          </div>
          <button
            onClick={onDownloadQuote}
            className="w-full mt-4 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download Quote
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-text-secondary mb-4">
            Generate a new customer quote once all required information is gathered from the conversation.
          </p>
          <button
            onClick={onGenerateQuote}
            disabled={isCallActive || !isEligible}
            className="bg-brand-secondary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Generate Quote
          </button>
          {!isCallActive && <EligibilityChecklist />}
        </div>
      )}
    </AnalysisPanel>
  );
};

export default QuotePanel;
