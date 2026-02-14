import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './WarpTransition.css';

const WarpTransition = ({ mode = 'literal', children }) => {
    const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 100,
        speed: 0.5 + Math.random() * 2,
        size: 1 + Math.random() * 2
    })), []);

    if (mode === 'subtle') {
        return (
            <motion.div
                className="warp-container subtle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="iridescent-pulse" />
                {children}
            </motion.div>
        );
    }

    return (
        <motion.div
            className="warp-container literal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="star-field">
                {stars.map(star => (
                    <motion.div
                        key={star.id}
                        className="star"
                        animate={{
                            scale: [0, 4, 0],
                            x: [0, Math.cos(star.angle) * 1000],
                            y: [0, Math.sin(star.angle) * 1000],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: star.speed,
                            repeat: Infinity,
                            ease: "easeIn",
                            delay: Math.random() * 2
                        }}
                        style={{
                            width: star.size,
                            height: star.size
                        }}
                    />
                ))}
            </div>
            <div className="warp-vortex" />
            <div className="warp-content">
                {children}
            </div>
        </motion.div>
    );
};

export default WarpTransition;
