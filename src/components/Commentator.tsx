import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import './Commentator.css';

const QUIPS = {
    LOW_ROLL: [
        "A 1? How... impressive.",
        "The dice clearly hate you today.",
        "Another low roll. Maybe try shaking it harder?",
        "Are we playing Ludo or 'Stay in the Yard'?"
    ],
    SIX_ROLL: [
        "A six! Don't waste it.",
        "Finally, some signs of life.",
        "Calculated. Definitely not luck.",
        "Oh, look who's moving now."
    ],
    CAPTURED: [
        "Back to the yard. Embarrassing.",
        "Did you not see that coming?",
        "That's gotta hurt. For you, anyway.",
        "Yard duty again? You must love it there."
    ],
    BLOCKADE: [
        "A blockade. Typical stalling tactics.",
        "Nobody's getting through that. How fun.",
        "Playing it safe, are we?"
    ],
    WIN: [
        "You won. I hope you're proud of beating a machine.",
        "Victory! The RNG was clearly biased.",
        "Game over. Finally."
    ],
    IDLE: [
        "Waiting for you to make a mistake...",
        "I've seen better moves in 2D Chess.",
        "Is the internet slow or are you just thinking?",
        "Hurry up, I have other matches to mock."
    ]
};

const Commentator = () => {
    const [msg, setMsg] = useState("Welcome to GoLudo. Try not to lose too fast.");
    const [quipType, setQuipType] = useState('IDLE');
    const { state, isRolling, isMoving } = useGameStore(s => ({
        state: s.state,
        isRolling: s.isRolling,
        isMoving: s.isMoving
    }));

    const lastDice = useRef(0);
    const lastActive = useRef(0);
    const lowRollCount = useRef(0);

    useEffect(() => {
        if (!state) return;

        // Reactive logic for quips
        if (state.diceValue !== lastDice.current && !isRolling) {
            lastDice.current = state.diceValue;

            if (state.diceValue === 6) {
                triggerQuip('SIX_ROLL');
                lowRollCount.current = 0;
            } else if (state.diceValue <= 2) {
                lowRollCount.current++;
                if (lowRollCount.current >= 3) {
                    setMsg("Three low rolls in a row? This is tragic.");
                } else {
                    triggerQuip('LOW_ROLL');
                }
            }
        }

        if (state.gamePhase === 'WIN') {
            triggerQuip('WIN');
        }

        if (state.activePlayer !== lastActive.current) {
            lastActive.current = state.activePlayer;
            // Maybe an idle quip on turn change
            if (Math.random() > 0.7) triggerQuip('IDLE');
        }

    }, [state, isRolling]);

    const triggerQuip = (type) => {
        const list = QUIPS[type];
        const randomQuip = list[Math.floor(Math.random() * list.length)];
        setMsg(randomQuip);
        setQuipType(type);
    };

    return (
        <motion.div
            className="commentator-pill liquid-glass"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
            <div className="bot-avatar">
                <motion.div
                    className="bot-eye"
                    animate={{ scaleY: [1, 0.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                />
                🤖
            </div>
            <div className="quip-container">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={msg}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`quip-text ${quipType.toLowerCase()}`}
                    >
                        {msg}
                    </motion.p>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default Commentator;
