import { useMemo, type ReactNode } from 'react';
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
            <div className="warp-container subtle warp-fade-in">
                <div className="iridescent-pulse" />
                {children}
            </div>
        );
    }

    return (
        <div className="warp-container literal warp-fade-in">
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
        </div>
    );
};

export default WarpTransition;
