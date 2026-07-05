import React from 'react';

/**
 * App-wide error boundary.
 *
 * Why this exists: a render-time throw anywhere in the tree (e.g. a Web3 direct-link /
 * reload arriving with a null game state) previously unmounted the whole app to a black,
 * unrecoverable screen — worse because the game viewport is scroll/pull-to-refresh locked.
 * This boundary catches the throw and shows a recoverable screen with a reload escape hatch.
 */
interface Props {
    children: React.ReactNode;
}
interface State {
    hasError: boolean;
    message?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: unknown): State {
        return { hasError: true, message: error instanceof Error ? error.message : String(error) };
    }

    componentDidCatch(error: unknown, info: unknown) {
        // Surfaces in production logs (Railway/Vercel) for diagnosis.
        console.error('[ErrorBoundary] Uncaught render error:', error, info);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleHome = () => {
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div style={styles.shell} role="alert" aria-live="assertive">
                <div style={styles.card}>
                    <div style={styles.emoji} aria-hidden="true">🎲</div>
                    <h1 style={styles.title}>Kurz verheddert</h1>
                    <p style={styles.text}>
                        Etwas ist beim Laden schiefgelaufen. Kein Einsatz geht verloren —
                        lade neu, um zurück ins Spiel zu kommen.
                    </p>
                    <div style={styles.actions}>
                        <button style={styles.primaryBtn} onClick={this.handleReload}>
                            Neu laden
                        </button>
                        <button style={styles.secondaryBtn} onClick={this.handleHome}>
                            Zur Startseite
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

const styles: Record<string, React.CSSProperties> = {
    shell: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #06060f 0%, #0b0b1e 55%, #080e1a 100%)',
        color: '#e8ecf5',
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        // Escape hatch: this screen is scrollable even though the game viewport is locked.
        overflow: 'auto',
        overscrollBehavior: 'auto',
    },
    card: {
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '32px 24px',
    },
    emoji: { fontSize: '44px', marginBottom: '8px' },
    title: { fontSize: '22px', fontWeight: 700, margin: '0 0 8px' },
    text: { fontSize: '15px', lineHeight: 1.5, color: '#aab3c5', margin: '0 0 24px' },
    actions: { display: 'flex', flexDirection: 'column', gap: '10px' },
    primaryBtn: {
        padding: '13px 20px',
        borderRadius: '12px',
        border: 'none',
        background: 'linear-gradient(135deg, #00f3ff, #3a86ff)',
        color: '#04121f',
        fontWeight: 700,
        fontSize: '15px',
        cursor: 'pointer',
    },
    secondaryBtn: {
        padding: '13px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'transparent',
        color: '#e8ecf5',
        fontWeight: 600,
        fontSize: '15px',
        cursor: 'pointer',
    },
};
