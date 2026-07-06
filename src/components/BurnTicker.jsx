/**
 * BurnTicker (G-022)
 *
 * Live deflation ticker fed by the backend `/api/burn` endpoint (G-018).
 * Shows total $GO burned vs. circulating supply. Hides itself entirely if
 * the endpoint is unavailable — the lobby must never break because of it.
 */
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { STAKE_CURRENCY_SYMBOL } from '../config/currency';
import { weiToGo } from '../utils/format';
import './BurnTicker.css';

const fmtWei = (wei) => weiToGo(wei, 4);

const BurnTicker = () => {
    const [burn, setBurn] = useState(null);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/api/burn`);
                if (!res.ok) return;
                const data = await res.json();
                if (alive && data?.available) setBurn(data);
            } catch { /* endpoint offline — ticker stays hidden */ }
        };
        load();
        const t = setInterval(load, 30000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    if (!burn) return null;

    return (
        <div
            className="burn-ticker"
            title={`Every match burns $${STAKE_CURRENCY_SYMBOL} from the protocol fee — fixed supply, real deflation.`}
        >
            <span className="burn-flame" aria-hidden="true">🔥</span>
            <span className="burn-value">{fmtWei(burn.totalBurned)} ${STAKE_CURRENCY_SYMBOL} burned</span>
            <span className="burn-supply">· {fmtWei(burn.circulatingSupply)} circulating</span>
        </div>
    );
};

export default BurnTicker;
