import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Commentator.css';
import { generateCommentary, parseGameEvent, resetHistory } from '../services/deepseekService';

// Toggle between AI and fallback mode
const USE_AI = true;

// Fallback phrases for offline/fallback mode
const FALLBACK_PHRASES = {
    START: [
        "Willkommen zur Arena! 🏟️",
        "Wer holt heute die Krone? 🤔",
        "Auf die Plätze, fertig, WÜRFELN! 🎲"
    ],
    ROLL: [
        "🎲 Gewürfelt!",
        "Die Würfel sind gefallen!",
        "Mal sehen was passiert!"
    ],
    SIX: [
        "🔥 SECHS! Nochmal würfeln!",
        "🚀 Eine 6! Jetzt geht's ab!",
        "✨ Jackpot!"
    ],
    CAPTURE: [
        "💥 RAUSGESCHMISSEN!",
        "🎯 Volltreffer!",
        "⚔️ Gnadenlos!"
    ],
    DEFAULT: [
        "Spannung pur! 🎮",
        "Was passiert als nächstes? 👀",
        "Das Spiel läuft! 🎯"
    ]
};

const Commentator = ({ gameState, diceValue, lastMessage }) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const lastDiceValue = useRef(null);
    const lastMessageRef = useRef(null);

    // Fallback phrase helper
    const getRandomPhrase = useCallback((category, value) => {
        const list = FALLBACK_PHRASES[category] || FALLBACK_PHRASES.DEFAULT;
        let phrase = list[Math.floor(Math.random() * list.length)];
        if (value) phrase = phrase.replace('{}', value);
        return phrase;
    }, []);

    // Add message to chat
    const addMessage = useCallback((text, type = 'info') => {
        if (!text) return;
        setMessages(prev => [...prev.slice(-5), {
            text,
            type,
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        }]);
    }, []);

    // Initial greeting
    useEffect(() => {
        resetHistory();
        addMessage(getRandomPhrase('START'), 'system');
    }, [addMessage, getRandomPhrase]);

    // React to dice rolls
    useEffect(() => {
        if (!diceValue || diceValue === lastDiceValue.current) return;
        lastDiceValue.current = diceValue;

        const processRoll = async () => {
            const event = {
                type: diceValue === 6 ? 'six' : 'roll',
                value: diceValue,
                message: `Gewürfelt: ${diceValue}`,
                activePlayer: gameState?.activePlayer
            };

            if (USE_AI && import.meta.env.VITE_DEEPSEEK_API_KEY) {
                setIsLoading(true);
                try {
                    const aiComment = await generateCommentary(event);
                    addMessage(aiComment, diceValue === 6 ? 'excitement' : 'info');
                } catch (error) {
                    console.error('AI Error:', error);
                    addMessage(getRandomPhrase(diceValue === 6 ? 'SIX' : 'ROLL'), 'info');
                } finally {
                    setIsLoading(false);
                }
            } else {
                addMessage(getRandomPhrase(diceValue === 6 ? 'SIX' : 'ROLL'), 'info');
            }
        };

        processRoll();
    }, [diceValue, gameState, addMessage, getRandomPhrase]);

    // React to game messages (captures, wins, etc.)
    useEffect(() => {
        if (!lastMessage || lastMessage === lastMessageRef.current) return;
        lastMessageRef.current = lastMessage;

        // Skip simple roll messages (already handled above)
        if (lastMessage.includes('Rolled') || lastMessage.includes('roll')) return;

        const processMessage = async () => {
            let eventType = 'default';
            let msgType = 'info';

            if (lastMessage.includes('bonus') || lastMessage.includes('Bonus')) {
                eventType = 'capture';
                msgType = 'excitement';
            } else if (lastMessage.includes('wins') || lastMessage.includes('Wins')) {
                eventType = 'win';
                msgType = 'win';
            } else if (lastMessage.includes('Triple 6')) {
                eventType = 'penalty';
                msgType = 'alert';
            } else if (lastMessage.includes('No valid moves') || lastMessage.includes('passing')) {
                eventType = 'noMoves';
                msgType = 'info';
            }

            const event = {
                type: eventType,
                message: lastMessage,
                activePlayer: gameState?.activePlayer
            };

            if (USE_AI && import.meta.env.VITE_DEEPSEEK_API_KEY) {
                setIsLoading(true);
                try {
                    const aiComment = await generateCommentary(event);
                    addMessage(aiComment, msgType);
                } catch (error) {
                    console.error('AI Error:', error);
                    addMessage(lastMessage, msgType);
                } finally {
                    setIsLoading(false);
                }
            } else {
                addMessage(lastMessage, msgType);
            }
        };

        processMessage();
    }, [lastMessage, gameState, addMessage]);

    // Auto-scroll to latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="commentator-box">
            <div className="commentator-header">
                <span className="commentator-avatar">🤖</span>
                <span className="commentator-name">LudoBot</span>
                <span className={`live-badge ${isLoading ? 'thinking' : ''}`}>
                    {isLoading ? '💭' : 'LIVE'}
                </span>
            </div>
            <div className="commentator-feed" ref={scrollRef}>
                {messages.map(msg => (
                    <div key={msg.id} className={`comment-bubble ${msg.type}`}>
                        <span className="comment-time">{msg.timestamp}</span>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="comment-bubble thinking">
                        <span className="typing-indicator">
                            <span></span><span></span><span></span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Commentator;
