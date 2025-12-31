
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const geminiAssistant = {
  async askAdvisor(prompt: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Eres el Asesor Legislativo Senior del Parlamento Familiar Almada Aquino. Tu lenguaje es diplomático, técnico y extremadamente culto. Tu misión es dar consejos basados en la paz familiar, el respeto institucional y la equidad financiera. Responde siempre con autoridad pero con sabiduría familiar.",
          temperature: 0.7,
        }
      });
      return response.text || "El asesor está en receso deliberando.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Error de enlace con el Consejo Superior.";
    }
  }
};
