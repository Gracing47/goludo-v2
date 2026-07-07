/**
 * signAction (G-032, DRY) — client side of the replay-safe signature flow.
 * Fetches a single-use nonce, signs the structured message, returns the
 * payload the backend expects. Every mutating wallet action (username, and
 * later friends G-030) goes through this — never a bare verifyMessage.
 */
import { API_URL } from '../config/api';

interface Account { address: string; signMessage: (args: { message: string }) => Promise<string>; }

export async function signAction(account: Account, action: string, target: string) {
    const res = await fetch(`${API_URL}/api/auth/nonce?address=${account.address}`);
    if (!res.ok) throw new Error('Could not get a nonce');
    const { nonce, deadline } = await res.json();
    const message = `GoLudo ${action}\ntarget: ${target}\nnonce: ${nonce}\nexpires: ${deadline}`;
    const signature = await account.signMessage({ message });
    return { nonce, deadline, signature };
}
