
import { GoogleGenAI, Type } from "@google/genai";
import { WishResponse } from "../types";

export const generateWish = async (topic: string): Promise<WishResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a short, cosmic, and poetic wish or blessing about ${topic}. Keep it under 20 words. Format as JSON with 'message' and 'author' (like 'The Stars' or 'The Void').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          author: { type: Type.STRING }
        },
        required: ["message", "author"]
      }
    }
  });

  try {
    return JSON.parse(response.text) as WishResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      message: "May the light of a thousand stars guide your journey.",
      author: "Cosmic Architect"
    };
  }
};
