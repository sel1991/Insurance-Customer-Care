import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptEntry, AnalysisResult, Sentiment, ProductRecommendation, AccidentClaimDetails } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatTranscript = (transcript: TranscriptEntry[]): string => {
  return transcript.map(entry => `${entry.speaker}: ${entry.text}`).join('\n');
};

export const generateAgentResponse = async (transcript: TranscriptEntry[]): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a helpful and friendly call center agent for a fictional company called 'ABC General Insurance'. The customer is having an issue or has a question. Continue the conversation naturally based on the following transcript. Keep your response concise, professional, and empathetic. Do not repeat what the customer just said.

Current Conversation:
${formatTranscript(transcript)}

Agent:`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 150,
        topP: 0.95,
        topK: 40,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating agent response:", error);
    return "I'm having trouble connecting to my systems right now. Could you please repeat that?";
  }
};

export const analyzeConversation = async (transcript: TranscriptEntry[]): Promise<AnalysisResult> => {
    if (transcript.length === 0) {
        return {
            summary: "No conversation to analyze.",
            sentiment: "Neutral",
            nextActions: []
        };
    }
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the following call center conversation transcript for an insurance company. Provide a concise summary (2-3 sentences), determine the overall customer sentiment, and suggest 3 concrete next-best actions for the agent.

Transcript:
${formatTranscript(transcript)}
`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A concise summary of the entire conversation in 2-3 sentences.'
            },
            sentiment: {
              type: Type.STRING,
              description: 'The overall sentiment of the customer. Must be one of: Positive, Negative, Neutral, Mixed.',
              enum: ['Positive', 'Negative', 'Neutral', 'Mixed']
            },
            nextActions: {
              type: Type.ARRAY,
              description: 'A list of 3 concrete, actionable next steps for the agent.',
              items: { type: Type.STRING }
            }
          },
          required: ['summary', 'sentiment', 'nextActions']
        }
      }
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    const validSentiments: Sentiment[] = ['Positive', 'Negative', 'Neutral', 'Mixed'];
    if (!validSentiments.includes(parsedJson.sentiment)) {
      parsedJson.sentiment = 'Neutral';
    }

    return parsedJson as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return {
      summary: "Could not analyze the conversation due to an error.",
      sentiment: "Neutral",
      nextActions: ["Check API connection", "Review the transcript for issues"]
    };
  }
};

export const recommendProductsForNewCaller = async (transcript: TranscriptEntry[]): Promise<ProductRecommendation[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a product recommendation expert for a fictional insurance company called 'ABC General Insurance'. Your goal is to help a call center agent by analyzing a conversation with a potential new customer and recommending the most suitable insurance products.

Based on the provided transcript, identify the customer's needs, life situation, assets, and potential risks. Then, recommend 2-3 products from the list below that would be the best fit. For each recommendation, provide a concise, 1-2 sentence explanation for why it's a good choice for this specific customer.

**ABC General Insurance Products:**
- **AutoGuard Plus**: Comprehensive auto insurance covering accidents, theft, and damage, with optional roadside assistance and rental car coverage.
- **HomeSafe Secure**: Homeowners insurance that protects the structure of the home, personal belongings, and provides liability coverage against accidents on the property.
- **RentersProtect**: Affordable coverage for a renter's personal property (like electronics, furniture) against theft or damage, and includes liability protection.
- **LifeLine Term**: Simple, affordable term life insurance that provides a financial safety net for the customer's loved ones in the event of their passing.
- **BusinessShield**: Customizable insurance for small to medium-sized businesses, covering property, liability, and business interruption.

Analyze the following transcript:
${formatTranscript(transcript)}
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: "List of 2-3 recommended insurance products.",
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: {
                    type: Type.STRING,
                    description: "The name of the recommended product. Must be one of the official product names.",
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: "A concise, 1-2 sentence explanation of why this product is a good fit for the customer based on the transcript.",
                  },
                },
                required: ['productName', 'reasoning'],
              },
            },
          },
          required: ['recommendations'],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    return parsedJson.recommendations || [];

  } catch (error) {
    console.error("Error recommending products:", error);
    return [];
  }
};

export const processAccidentClaim = async (transcript: TranscriptEntry[]): Promise<AccidentClaimDetails> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a claims processing assistant for 'ABC General Insurance'. Your task is to analyze the following call transcript where a customer is reporting an auto accident. Extract the key details needed to file a preliminary claim report.

Analyze the transcript and provide the information in a structured JSON format. If a specific piece of information is not mentioned in the conversation, use a value of null for that field.

Transcript:
${formatTranscript(transcript)}
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            policyholderName: { type: Type.STRING, description: "The full name of the policyholder.", nullable: true },
            policyNumber: { type: Type.STRING, description: "The policy number mentioned by the customer.", nullable: true },
            accidentDate: { type: Type.STRING, description: "The date and time of the accident.", nullable: true },
            accidentLocation: { type: Type.STRING, description: "The specific location of the accident (e.g., address, intersection).", nullable: true },
            incidentDescription: { type: Type.STRING, description: "A brief summary of how the accident occurred.", nullable: true },
            vehiclesInvolved: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of the vehicles involved, including make and model if mentioned.", nullable: true },
            injuriesReported: { type: Type.STRING, description: "Details about any injuries to any party involved. State 'None reported' if no injuries are mentioned.", nullable: true },
            policeReportFiled: { type: Type.STRING, description: "Confirmation of whether a police report was filed and the report number, if available.", nullable: true },
          },
          required: ['policyholderName', 'policyNumber', 'accidentDate', 'accidentLocation', 'incidentDescription', 'vehiclesInvolved', 'injuriesReported', 'policeReportFiled'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as AccidentClaimDetails;

  } catch (error) {
    console.error("Error processing accident claim:", error);
    // Return a default error state
    return {
      policyholderName: "Error",
      policyNumber: "Error",
      accidentDate: "Error",
      accidentLocation: "Error",
      incidentDescription: "Could not process claim due to an API error.",
      vehiclesInvolved: [],
      injuriesReported: "Error",
      policeReportFiled: "Error",
    };
  }
};
