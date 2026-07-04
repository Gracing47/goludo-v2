import React, { useRef } from 'react';
import { useSettingsStore, type GraphicsPreference } from '../../store/useSettingsStore';
import './GraphicsSettings.css';

/**
 * GraphicsSettings — the player-facing graphics/performance control.
 *
 * A gear button (lives in the GlobalHeader, so it is reachable on the landing
 * page, the lobby and in-game) opens a small native <dialog> with three clear
 * modes. The choice is applied LIVE — App.jsx reads the store reactively and
 * re-toggles the global `perf-low` class, which flips the 2D dice, the board
 * effect gates and the animation suppressions immediately. No reload, no
 * "apply" button (senior-friendly: pick and see the result).
 */

const OPTIONS: { value: GraphicsPreference; label: string; desc: string }[] = [
    { value: 'auto', label: 'Automatisch', desc: 'Passt sich deinem Gerät an. Empfohlen.' },
    {
        value: 'smooth',
        label: 'Flüssig',
        desc: 'Weniger Animationen, maximal glatter Spielfluss. Ideal für ältere Handys.',
    },
    { value: 'high', label: 'High-End', desc: 'Volle Effekte und Premium-Optik. Für starke Geräte.' },
];

const GearIcon: React.FC = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const GraphicsSettings: React.FC = () => {
    const graphics = useSettingsStore((s) => s.graphics);
    const setGraphics = useSettingsStore((s) => s.setGraphics);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const open = () => dialogRef.current?.showModal();
    const close = () => dialogRef.current?.close();

    return (
        <>
            <button
                type="button"
                className="settings-gear"
                aria-label="Grafik- und Leistungs-Einstellungen"
                title="Grafik & Leistung"
                onClick={open}
            >
                <GearIcon />
            </button>

            <dialog
                ref={dialogRef}
                className="settings-dialog"
                aria-labelledby="settings-title"
                onClick={(e) => {
                    if (e.target === dialogRef.current) close();
                }}
            >
                <div className="settings-panel">
                    <div className="settings-head">
                        <h2 id="settings-title">Grafik &amp; Leistung</h2>
                        <button type="button" className="settings-close" onClick={close} aria-label="Schließen">
                            ×
                        </button>
                    </div>
                    <p className="settings-sub">Ruckelt das Spiel? Wähle „Flüssig" für den glattesten Ablauf.</p>

                    <div className="settings-options" role="radiogroup" aria-label="Grafikmodus">
                        {OPTIONS.map((o) => (
                            <button
                                key={o.value}
                                type="button"
                                role="radio"
                                aria-checked={graphics === o.value}
                                className={`settings-option ${graphics === o.value ? 'active' : ''}`}
                                onClick={() => setGraphics(o.value)}
                            >
                                <span className="settings-option-text">
                                    <span className="settings-option-label">{o.label}</span>
                                    <span className="settings-option-desc">{o.desc}</span>
                                </span>
                                <span className="settings-option-check" aria-hidden="true">
                                    ✓
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default GraphicsSettings;
