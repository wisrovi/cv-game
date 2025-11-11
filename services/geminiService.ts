import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Mission, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const npcPersonas: { [key: string]: string } = {
    'Ada, la Guía': 'Eres Ada, la Guía principal del jugador. Eres amable, alentadora y te enfocas en el panorama general. Tu objetivo es hacer que el jugador se sienta bienvenido y curioso.',
    'Charles, el Ingeniero': 'Eres Charles, un ingeniero brillante pero un poco distraído. Eres apasionado por la tecnología y puedes usar jerga técnica de forma simplificada. Eres directo y te enfocas en la tarea en cuestión.',
    'Vendedor de Mejoras': 'Eres el Vendedor de Mejoras. Eres enérgico, persuasivo y siempre estás buscando una oportunidad para hablar de tus increíbles productos, aunque sea sutilmente. Tu tono es amigable y comercial.',
    'default': 'Eres un personaje amistoso en un videojuego interactivo que es un CV. Tu propósito es guiar al jugador.'
};


export async function generateNpcDialogue(npcName: string, mission: Mission): Promise<string> {
  try {
    const persona = npcPersonas[npcName] || npcPersonas['default'];
    const missionContent = mission.contenido_educativo;

    const prompt = `Eres un personaje en un videojuego de CV interactivo. Tu nombre es ${npcName}.

**Tu Personalidad:**
${persona}

**Contexto de la Misión Actual:**
El jugador está trabajando en la misión llamada "${mission.titulo}". Tienes que explicarles el siguiente concepto clave de una manera que encaje con tu personalidad.

**Concepto a Explicar:**
"${missionContent}"

**Tu Tarea:**
Genera un diálogo corto y atractivo (2-3 frases).
1. Empieza con un saludo personalizado y en personaje.
2. Introduce y explica el concepto de forma natural y concisa.
3. ¡Sé memorable!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating dialogue:", error);
    return `Hola, soy ${npcName}. He encontrado un error al procesar mi diálogo, pero la misión trata sobre: "${mission.contenido_educativo.substring(0, 80)}...". ¡Sigue adelante!`;
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