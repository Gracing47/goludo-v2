import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import './WarpTransition.css';

interface WarpTransitionProps {
    mode?: 'literal' | 'subtle';
    children?: ReactNode;
}

const WarpTransition = ({ mode = 'literal', children }: WarpTransitionProps) => {
    const stars = useMemo(() => Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        angle: Math.random() * Math.PI * 2,
        distance: 80 + Math.random() * 120,
        speed: 0.4 + Math.random() * 1.8,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 2.5,
    })), []);

    if (mode === 'subtle') {
        return (
            <motion.div
                className="warp-container subtle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.23, 1, 0.32, 1] }}
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
            transition={{ duration: 0.36, ease: [0.23, 1, 0.32, 1] }}
        >
            {/* Rotating neon vortex grid */}
            <div className="warp-vortex" />

            {/* Hyperspace star streaks */}
            <div className="star-field">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="star star-animated"
                        style={{
                            width: star.size,
                            height: star.size,
                            '--star-speed': `${star.speed}s`,
                            '--star-delay': `${star.delay}s`,
                            '--star-dest-x': `${Math.cos(star.angle) * star.distance * 8}px`,
                            '--star-dest-y': `${Math.sin(star.angle) * star.distance * 8}px`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            <div className="warp-content">
                {children}
            </div>
        </motion.div>
    );
};

export default WarpTransition;
