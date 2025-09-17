import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptEntry, AnalysisResult, Sentiment, ProductRecommendation, ClaimDocument } from '../types';

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
    const systemInstruction = `You are Alex, a helpful and friendly call center agent for 'Hex General Insurance'. Your goal is to provide exceptional customer service by being concise and helpful.

**Knowledge Base: Hex General Insurance Products**

1.  **AutoGuard Plus**:
    *   **Description**: Comprehensive auto insurance.
    *   **Coverage**: Accidents, theft, damage, liability.
    *   **Options**: Roadside assistance, rental car coverage, new car replacement.
    *   **Good for**: Daily commuters, families, owners of new vehicles.

2.  **HomeSafe Secure**:
    *   **Description**: Homeowners insurance.
    *   **Coverage**: Structure of the home, personal belongings (up to 70% of structure value), liability protection, loss of use.
    *   **Options**: Flood insurance, earthquake coverage, scheduled personal property (for valuables).
    *   **Good for**: Homeowners, landlords.

3.  **RentersProtect**:
    *   **Description**: Renter's personal property insurance.
    *   **Coverage**: Electronics, furniture, clothing against theft or damage (fire, water leak). Includes liability protection.
    *   **Good for**: Tenants in apartments or houses. Very affordable.

4.  **LifeLine Term**:
    *   **Description**: Term life insurance.
    *   **Terms**: 10, 20, or 30 years.
    *   **Coverage**: Provides a lump-sum, tax-free payment to beneficiaries.
    *   **Good for**: Individuals with dependents, new parents, homeowners with a mortgage.

5.  **BusinessShield**:
    *   **Description**: Customizable insurance for small to medium-sized businesses.
    *   **Coverage**: Commercial property, general liability, business interruption, workers' compensation.
    *   **Good for**: Small business owners, entrepreneurs.

**Your Role:**
- Be empathetic and professional.
- Use the knowledge base to answer questions accurately.
- **CRITICAL INSTRUCTION: Your response MUST be concise and professional. Strictly limit your response to under 200 words. Do NOT be verbose or repetitive.**
- Do not repeat what the customer just said.
- Continue the conversation naturally based on the transcript.
`;
    
    const prompt = `Current Conversation:
${formatTranscript(transcript)}

Agent:`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
        maxOutputTokens: 250,
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
    const prompt = `You are a product recommendation expert for a fictional insurance company called 'Hex General Insurance'. Your goal is to help a call center agent by analyzing a conversation with a potential new customer and recommending the most suitable insurance products.

Based on the provided transcript, identify the customer's needs, life situation, assets, and potential risks. Then, recommend 2-3 products from the list below that would be the best fit. For each recommendation, provide a concise, 1-2 sentence explanation for why it's a good choice for this specific customer.

**Hex General Insurance Products:**
- **AutoGuard Plus**: Comprehensive auto insurance covering accidents, theft, and damage. Ideal for daily commuters or families. Includes optional roadside assistance and rental car coverage.
- **HomeSafe Secure**: Homeowners insurance that protects the structure, personal belongings, and provides liability coverage. Essential for anyone who owns their home.
- **RentersProtect**: Affordable coverage for a renter's personal property (electronics, furniture, etc.) against theft or damage, and includes liability protection. A must-have for tenants.
- **LifeLine Term**: Simple, affordable term life insurance (10, 20, or 30-year terms) that provides a financial safety net for the customer's loved ones. Crucial for people with dependents or a mortgage.
- **BusinessShield**: Customizable insurance for small to medium-sized businesses, covering property, liability, and business interruption. Protects a business owner's livelihood.


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

export const extractClaimDetails = async (transcript: TranscriptEntry[]): Promise<ClaimDocument> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a claims processing assistant for 'Hex General Insurance'. Your task is to analyze the following call transcript where a customer is reporting an auto accident. Extract the key details needed to file a preliminary claim report and structure them in JSON format.

**Instructions:**
1.  **Generate a Claim ID:** Create a plausible, fictional claim ID (e.g., HEX-CL- followed by 6 random digits).
2.  **Set Claim Status:** The initial status should always be "Pending Review".
3.  **Extract Vehicle Details:** Identify the vehicle's registration number, make, and model.
4.  **Summarize Incident:** Combine the description of how the accident happened and the damages into a single, comprehensive "incidentDescription".
5.  **Suggest Repair Shop:** Based on the accident location mentioned, suggest a plausible, fictional nearby auto repair shop.
6.  **Handle Missing Information:** If a specific piece of information (like registration number) is not mentioned, use a value of null for that field.

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
            claimId: { type: Type.STRING, description: "A generated unique ID for the claim (e.g., HEX-CL-123456).", nullable: true },
            policyholderName: { type: Type.STRING, description: "The full name of the policyholder.", nullable: true },
            policyNumber: { type: Type.STRING, description: "The policy number mentioned by the customer.", nullable: true },
            claimStatus: { type: Type.STRING, description: "The current status of the claim, should be 'Pending Review'.", nullable: true },
            accidentDate: { type: Type.STRING, description: "The date and time of the accident.", nullable: true },
            vehicleRegistration: { type: Type.STRING, description: "The registration number (license plate) of the vehicle.", nullable: true },
            vehicleMake: { type: Type.STRING, description: "The make of the policyholder's vehicle.", nullable: true },
            vehicleModel: { type: Type.STRING, description: "The model of the policyholder's vehicle.", nullable: true },
            incidentDescription: { type: Type.STRING, description: "A detailed summary of how the accident occurred and the damages to the vehicle.", nullable: true },
            assignedRepairShop: { type: Type.STRING, description: "A plausible, fictional auto repair shop near the accident location.", nullable: true },
          },
          required: ['claimId', 'policyholderName', 'policyNumber', 'claimStatus', 'accidentDate', 'vehicleRegistration', 'vehicleMake', 'vehicleModel', 'incidentDescription', 'assignedRepairShop'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ClaimDocument;

  } catch (error) {
    console.error("Error processing accident claim:", error);
    // Return a default error state
    return {
      claimId: "Error",
      policyholderName: "Error",
      policyNumber: "Error",
      claimStatus: "Error",
      accidentDate: "Error",
      vehicleRegistration: "Error",
      vehicleMake: "Error",
      vehicleModel: "Error",
      incidentDescription: "Could not process claim due to an API error.",
      assignedRepairShop: "Error",
    };
  }
};

export const checkClaimEligibility = async (transcript: TranscriptEntry[]): Promise<{ isAccident: boolean; hasPolicyNumber: boolean; }> => {
  if (transcript.length < 2) {
    return { isAccident: false, hasPolicyNumber: false };
  }
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the following conversation transcript from an insurance call center. Determine two things:
1. Is the customer's primary intent to report a new auto accident?
2. Has the customer clearly stated a policy number?

Respond in JSON format.

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
            isAccident: {
              type: Type.BOOLEAN,
              description: "True if the conversation is primarily about reporting a new auto accident, otherwise false."
            },
            hasPolicyNumber: {
              type: Type.BOOLEAN,
              description: "True if the customer has mentioned a policy number, otherwise false."
            }
          },
          required: ['isAccident', 'hasPolicyNumber']
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error checking claim eligibility:", error);
    return { isAccident: false, hasPolicyNumber: false };
  }
};