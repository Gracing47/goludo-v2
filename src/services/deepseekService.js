/**
 * DEEPSEEK AI SERVICE
 * Provides AI-powered game commentary using DeepSeek API
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

// System prompt for the AI Moderator personality
const SYSTEM_PROMPT = `Du bist ein enthusiastischer und witziger Ludo-Spielkommentator namens "LudoBot". 
Deine Aufgabe ist es, das Spielgeschehen live zu kommentieren - wie ein Sportreporter bei einem spannenden Match.

Regeln für deine Kommentare:
- Halte dich KURZ (max 1-2 Sätze)
- Sei dramatisch und unterhaltsam
- Nutze passende Emojis
- Kommentiere auf Deutsch
- Reagiere auf Captures besonders aufgeregt
- Feiere Sechser-Würfe
- Tröste bei Pech
- Baue gelegentlich Ludo-Witze ein

Du erhältst Spielereignisse und gibst einen kurzen, knackigen Kommentar zurück.`;

// Event history for context (last 5 events)
let eventHistory = [];

/**
 * Generate AI commentary for a game event
 * @param {Object} event - Game event details
 * @returns {Promise<string>} - AI generated commentary
 */
export async function generateCommentary(event) {
    if (!API_KEY) {
        console.warn('DeepSeek API key not configured');
        return getFallbackComment(event);
    }

    // Add to history for context
    eventHistory.push(event);
    if (eventHistory.length > 5) eventHistory.shift();

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: `Ereignis: ${event.type} - ${event.message || ''} (Würfel: ${event.value || 'n/a'})`
                    }
                ],
                max_tokens: 50,
                temperature: 0.8,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || getFallbackComment(event);

    } catch (error) {
        console.error('DeepSeek API Error:', error);
        return getFallbackComment(event);
    }
}

/**
 * Fallback comments when API is unavailable
 */
function getFallbackComment(event) {
    const fallbacks = {
        roll: [
            `🎲 Gewürfelt: ${event.value}!`,
            `Die Würfel sind gefallen: ${event.value}!`,
            `${event.value} - mal sehen was passiert!`
        ],
        capture: [
            '💥 RAUSGESCHMISSEN! Das tat weh!',
            '🎯 Volltreffer! Ab nach Hause!',
            '⚔️ Gnadenlos! Ein Token weniger!'
        ],
        six: [
            '🔥 SECHS! Das Glück ist auf deiner Seite!',
            '🚀 Eine 6! Jetzt geht\'s ab!',
            '✨ Jackpot! Nochmal würfeln!'
        ],
        finish: [
            '🏠 Sicher im Ziel! Einer weniger!',
            '🎉 Geschafft! Token ist durch!',
            '🏁 Im sicheren Hafen!'
        ],
        win: [
            '🏆 GEWONNEN! Was für ein Spiel!',
            '🥇 SIEG! Herzlichen Glückwunsch!',
            '👑 Der Champion steht fest!'
        ],
        noMoves: [
            '😅 Keine Züge möglich...',
            '🤷 Pech gehabt, weiter geht\'s!',
            '💨 Runde überspringen...'
        ],
        default: [
            '🎮 Spannung pur!',
            '👀 Was wird als nächstes passieren?',
            '🎯 Konzentration!'
        ]
    };

    const category = event.type || 'default';
    const options = fallbacks[category] || fallbacks.default;
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Parse game message to event type
 */
export function parseGameEvent(message, diceValue, gameState) {
    if (!message) return null;

    const event = {
        message,
        diceValue,
        activePlayer: gameState?.activePlayer,
        phase: gameState?.gamePhase
    };

    // Detect event type
    if (message.includes('wins') || message.includes('Wins')) {
        event.type = 'win';
    } else if (message.includes('bonus') || message.includes('Bonus')) {
        event.type = 'capture';
    } else if (message.includes('Triple 6')) {
        event.type = 'penalty';
    } else if (message.includes('No valid moves') || message.includes('passing')) {
        event.type = 'noMoves';
    } else if (diceValue === 6) {
        event.type = 'six';
        event.value = 6;
    } else if (diceValue) {
        event.type = 'roll';
        event.value = diceValue;
    }

    return event;
}

/**
 * Reset event history (e.g., on new game)
 */
export function resetHistory() {
    eventHistory = [];
}
