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

export interface AccidentClaimDetails {
  policyholderName: string | null;
  policyNumber: string | null;
  accidentDate: string | null;
  accidentLocation: string | null;
  incidentDescription: string | null;
  vehiclesInvolved: string[] | null;
  injuriesReported: string | null;
  policeReportFiled: string | null;
}
