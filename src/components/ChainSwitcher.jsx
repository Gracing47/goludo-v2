/**
 * ChainSwitcher (G-026b)
 *
 * In-UI chain selection. Hidden when only one chain is configured. Switching
 * persists the choice and reloads the app so every contract binding
 * re-initializes cleanly — no half-switched state.
 */
import React from 'react';
import { ACTIVE_CHAIN_ID, activeChainConfig, selectableChains, switchActiveChain } from '../config/chains';
import './ChainSwitcher.css';

const ChainSwitcher = () => {
    const chains = selectableChains();
    if (chains.length < 2) return null;

    const onChange = (e) => {
        const id = Number(e.target.value);
        if (id === ACTIVE_CHAIN_ID) return;
        const target = chains.find(c => c.id === id);
        if (window.confirm(`Switch to ${target?.label}? Open rooms stay on their own chain; the app will reload.`)) {
            switchActiveChain(id);
        } else {
            e.target.value = String(ACTIVE_CHAIN_ID);
        }
    };

    return (
        <label className="chain-switcher" title={`Active network: ${activeChainConfig.label}`}>
            <span className="chain-dot" aria-hidden="true" />
            <select value={ACTIVE_CHAIN_ID} onChange={onChange} aria-label="Select network">
                {chains.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                ))}
            </select>
        </label>
    );
};

export default ChainSwitcher;
