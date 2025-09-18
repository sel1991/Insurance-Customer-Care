export type Speaker = 'Customer' | 'Agent';

export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
}

export type Sentiment = 'Positive' | 'Negative' | 'Neutral' | 'Mixed';

export interface AnalysisResult {
  summary: string;
  sentiment: Sentiment;
  nextActions: string[];
}

export interface ProductRecommendation {
  productName: string;
  reasoning: string;
}

export interface ClaimDocument {
  claimId: string | null;
  policyholderName: string | null;
  policyNumber: string | null;
  claimStatus: string | null;
  accidentDate: string | null;
  vehicleRegistration: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  incidentDescription: string | null;
  assignedRepairShop: string | null;
}

export interface QuoteEligibility {
  hasName: boolean;
  hasDob: boolean;
  hasTenure: boolean;
}

export interface QuoteDetails {
  quoteId: string;
  customerName: string;
  dateOfBirth: string;
  policyType: string;
  tenure: string;
  monthlyPremium: number;
  annualPremium: number;
  coverageDetails: {
    liability: string;
    collision: string;
    comprehensive: string;
  };
}
