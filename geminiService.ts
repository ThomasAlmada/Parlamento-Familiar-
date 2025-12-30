
import { GoogleGenAI } from "@google/genai";

/**
 * Initializes the GoogleGenAI client using the required apiKey from environment variables.
 * @google/genai SDK requires the apiKey to be passed as a named parameter.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const geminiAssistant = {
  /**
   * Queries the AI advisor for legislative guidance within the family parliament.
   * Uses 'gemini-3-flash-preview' as it is the recommended model for basic text and Q&A tasks.
   */
  async askAdvisor(prompt: string) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Eres el Asesor Jurídico Senior del Parlamento Familiar Almada Aquino. Tu tono es extremadamente formal, diplomático y sabio. Ayudas a resolver conflictos familiares mediante la lógica legislativa.",
        }
      });
      // response.text is a getter, not a method.
      return response.text || "El asesor está deliberando, por favor intente nuevamente.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Error de conexión con el Gran Consejo Legislativo.";
    }
  },

  /**
   * Summarizes a motion to analyze its viability.
   */
  async summarizeMocion(mocion: any) {
    try {
      const ai = getAI();
      const prompt = `Resume y analiza la viabilidad de esta moción familiar: Título: ${mocion.titulo}. Descripción: ${mocion.descripcion}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "No se pudo generar el resumen.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Error al procesar el resumen.";
    }
  }
};
