
import { GoogleGenAI, Type } from "@google/genai";
import type { Receipt } from '../types';

// Assumes API_KEY is set in the environment.
// Do not modify this line. The key is configured externally.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textPrompt = `You are an expert document parser. Analyze the following receipt. Extract and return the data in strict JSON format. If a field is missing, return null for it. The items array should contain all line items from the receipt.`;

const receiptSchema = {
    type: Type.OBJECT,
    properties: {
        merchant: { type: Type.STRING, description: "Name of the store or merchant." },
        date: { type: Type.STRING, description: "Date of the transaction in YYYY-MM-DD format." },
        total_amount: { type: Type.NUMBER, description: "The final total amount paid." },
        location: { type: Type.STRING, description: "The physical address of the merchant, if available." },
        card_number: { type: Type.STRING, description: "The last 4 digits of the credit/debit card, if present." },
        items: {
            type: Type.ARRAY,
            description: "List of all items purchased.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the purchased item." },
                    quantity: { type: Type.NUMBER, description: "Quantity of the item, if specified." },
                    price: { type: Type.NUMBER, description: "Price of the single item or total for the line item." },
                },
                required: ["name", "price"]
            }
        }
    },
    required: ["merchant", "date", "total_amount", "items"]
};


export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<Receipt> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: textPrompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    
    // Basic validation to ensure the response matches the expected structure
    if (!parsedJson || typeof parsedJson.merchant === 'undefined') {
        throw new Error("AI response is not in the expected format.");
    }

    return parsedJson as Receipt;

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw new Error("Could not extract details from the receipt. The AI model failed to process the request. Please try again with a clearer image.");
  }
};
