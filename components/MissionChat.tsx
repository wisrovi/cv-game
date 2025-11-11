import React, { useState, useRef, useEffect } from 'react';
import { Mission, ChatMessage } from '../types';
import { generateChatResponse } from '../services/geminiService';

interface MissionChatProps {
    mission: Mission;
    onClose: () => void;
}

const MissionChat: React.FC<MissionChatProps> = ({ mission, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        setMessages([{
            sender: 'gemini',
            text: `¡Hola! Soy tu asistente para el proyecto "${mission.titulo}". Puedo consultar información en vivo desde su repositorio. ¿Qué te gustaría saber sobre ${mission.referencia.split('/').pop()}?`
        }]);
    }, [mission]);

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const geminiResponse = await generateChatResponse(mission, newMessages, userMessage.text);
            setMessages([...newMessages, { sender: 'gemini', text: geminiResponse.text, sources: geminiResponse.sources }]);
        } catch (error) {
            setMessages([...newMessages, { sender: 'gemini', text: 'Hubo un error al procesar tu pregunta.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box wide chat-box" onClick={(e) => e.stopPropagation()}>
                <h3>Chat del Proyecto: {mission.titulo}</h3>
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}-message`}>
                            <p>{msg.text}</p>
                            {msg.sender === 'gemini' && msg.sources && msg.sources.length > 0 && (
                                <div className="sources-container">
                                    <strong>Fuentes:</strong>
                                    <ul>
                                        {msg.sources.map((source, i) => (
                                            <li key={i}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message gemini-message">
                           <div className="typing-indicator">
                               <span></span><span></span><span></span>
                           </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-area">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pregunta sobre el proyecto..."
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading}>
                        Enviar
                    </button>
                </div>
                <button onClick={onClose} style={{marginTop: '20px'}}>Cerrar Chat</button>
            </div>
        </div>
    );
};

export default MissionChat;