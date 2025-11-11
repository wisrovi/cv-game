import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Mission, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateNpcDialogue(npcName: string, missionContent: string): Promise<string> {
  try {
    const prompt = `Eres un personaje amistoso llamado ${npcName} en un videojuego interactivo que es un CV. Tu propósito es guiar al jugador. Explica el siguiente concepto de una manera amigable, atractiva y concisa (2-3 frases cortas) para alguien que está aprendiendo sobre este proyecto de software. No saludes, ve directo a la explicación. Concepto: "${missionContent}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating dialogue:", error);
    return `Hola, soy ${npcName}. He encontrado un error al procesar mi diálogo, pero la misión trata sobre: "${missionContent.substring(0, 80)}...". ¡Sigue adelante!`;
  }
}

export async function generateChatResponse(mission: Mission, chatHistory: ChatMessage[], userQuestion: string): Promise<{ text: string; sources: { uri: string; title: string }[] }> {
    try {
        const historyPrompt = chatHistory.map(msg => `${msg.sender === 'user' ? 'Usuario' : 'Asistente'}: ${msg.text}`).join('\n');

        const prompt = `Eres un asistente experto en ingeniería de software. Tu objetivo es responder preguntas sobre el proyecto "${mission.titulo}".
Utiliza la información obtenida de la búsqueda en Google sobre la siguiente URL para fundamentar tu respuesta: ${mission.referencia}.
Responde de manera clara y útil.

Historial de la conversación:
${historyPrompt}

Pregunta del usuario: "${userQuestion}"
Tu respuesta:`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title)
            .map(web => ({ uri: web.uri, title: web.title }));
        
        // FIX: The original method using `Array.from(new Map(...).values())` was causing a type inference error, resulting in `unknown[]`.
        // This has been replaced with a more explicit and readable approach that is guaranteed to be type-safe.
        const sourcesByUri: Record<string, { uri: string; title: string }> = {};
        for (const source of sources) {
            sourcesByUri[source.uri] = source;
        }
        const uniqueSources = Object.values(sourcesByUri);

        return { text, sources: uniqueSources };

    } catch (error) {
        console.error("Error generating chat response:", error);
        return { 
            text: "Lo siento, he tenido un problema para conectar con mis circuitos de conocimiento. Por favor, intenta hacer otra pregunta.",
            sources: [] 
        };
    }
}
