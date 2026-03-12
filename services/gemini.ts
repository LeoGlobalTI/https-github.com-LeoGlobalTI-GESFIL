
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeOperationalHealth = async (tickets: any[], services: any[]) => {
  try {
    const dataSummary = services.map(s => {
      const sTickets = tickets.filter(t => t.serviceId === s.id);
      return {
        service: s.name,
        total: sTickets.length,
        completed: sTickets.filter(t => t.status === 'COMPLETED').length,
        waiting: sTickets.filter(t => t.status === 'WAITING').length,
        cancelled: sTickets.filter(t => t.status === 'CANCELLED').length,
      };
    });

    const prompt = `Actúa como un experto en eficiencia hospitalaria. Analiza estos datos de atención y proporciona una recomendación táctica de 2 frases para el equipo de gestión: ${JSON.stringify(dataSummary)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Optimización en tiempo real activa. Analizando patrones de flujo...";
  }
};
