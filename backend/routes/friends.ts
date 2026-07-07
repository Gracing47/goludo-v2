/**
 * Friends API (G-030). Every mutation is authenticated with the replay-safe
 * signed-action flow (G-032): the client signs `friend-<action>` with the
 * target as payload; we recover + consume the nonce, then act as that wallet.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { FriendManager } from '../services/friendManager.js';
import { ProfileManager } from '../services/profileManager.js';
import { verifySignedAction } from '../services/signedAction.js';

const router = express.Router();
const friends = FriendManager.getInstance();
const profiles = ProfileManager.getInstance();

// Spam brake (Daniel W2): friend actions are cheap to mint, rate-limit hard.
const friendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many friend actions. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const isAddr = (a: unknown): a is string => typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a);

// Daniel B1: reading a social graph + presence must be OWNER-ONLY. One signed
// session (short-lived bearer token) authorizes the polling GET — no per-poll
// wallet popups, no unauthenticated graph scraping.
import crypto from 'crypto';
const sessions = new Map<string, { address: string; expires: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000;
function sweepSessions() { const now = Date.now(); for (const [k, v] of sessions) if (v.expires < now) sessions.delete(k); }

/** Resolve a target given as address OR username → lowercase address. */
async function resolveTarget(raw: unknown): Promise<string | null> {
    if (isAddr(raw)) return (raw as string).toLowerCase();
    if (typeof raw === 'string' && /^[a-zA-Z0-9_]{3,16}$/.test(raw)) {
        return profiles.addressByUsername(raw);
    }
    return null;
}

/** Verify the signed action and return { signer, target } (both lowercase). */
async function auth(action: string, body: any): Promise<{ signer: string; target: string }> {
    const target = await resolveTarget(body?.target);
    if (!target) { const e: any = new Error('Unknown player'); e.status = 404; throw e; }
    // The client signs the RAW target it typed; we verify against that, then map.
    const v = verifySignedAction({
        action: `friend-${action}`,
        target: String(body.target),
        nonce: body.nonce, deadline: body.deadline, signature: body.signature,
    });
    return { signer: v.signer.toLowerCase(), target };
}

// POST /api/friends/session — sign once to unlock reads for 30 min (Daniel B1)
router.post('/friends/session', friendLimiter, async (req, res) => {
    try {
        // target must equal the signer's own address (self-authorization)
        const target = await resolveTarget(req.body?.target);
        if (!target) return res.status(400).json({ error: 'Invalid address' });
        const v = verifySignedAction({
            action: 'friend-session', target: String(req.body.target),
            nonce: req.body.nonce, deadline: req.body.deadline, signature: req.body.signature,
        });
        if (v.signer.toLowerCase() !== target) return res.status(403).json({ error: 'Signer/address mismatch' });
        sweepSessions();
        const token = crypto.randomBytes(24).toString('hex');
        sessions.set(token, { address: v.signer.toLowerCase(), expires: Date.now() + SESSION_TTL_MS });
        res.json({ token, expires: Date.now() + SESSION_TTL_MS });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Could not start session' });
    }
});

// GET /api/friends/:address — full view + presence + names (OWNER-ONLY via token)
router.get('/friends/:address', friendLimiter, async (req, res) => {
    try {
        if (!isAddr(req.params.address)) return res.status(400).json({ error: 'Invalid address' });
        const me = req.params.address.toLowerCase();
        // Daniel B1: require a valid session token bound to this exact address.
        const token = String(req.header('x-friend-token') || '');
        const sess = sessions.get(token);
        if (!sess || sess.expires < Date.now() || sess.address !== me) {
            return res.status(401).json({ error: 'Sign in to view friends' });
        }
        const { friends: fr, incoming, outgoing } = await friends.list(me);
        const all = [...new Set([...fr, ...incoming, ...outgoing])];
        const names = await profiles.getUsernamesFor(all);
        const isOnline = (req.app.locals.isOnline as ((a: string) => boolean)) || (() => false);
        const shape = (addr: string, online: boolean) => ({ address: addr, username: names[addr] || null, online });
        res.json({
            friends: fr.map(a => shape(a, isOnline(a))),   // presence only for accepted friends
            incoming: incoming.map(a => shape(a, false)),
            outgoing: outgoing.map(a => shape(a, false)),
        });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to load friends' });
    }
});

// NOTE: NOT async — must return the handler function itself, not a Promise,
// or Express throws "argument handler must be a function".
function handle(action: string, fn: (signer: string, target: string) => Promise<any>) {
    return async (req: express.Request, res: express.Response) => {
        try {
            const { signer, target } = await auth(action, req.body);
            const result = await fn(signer, target);
            res.json({ ok: true, ...result });
        } catch (e: any) {
            // Daniel W2: distinguish user errors (400) from real failures (500).
            const status = e.status || (['SELF', 'NONE', 'OWN'].includes(e.code) ? 400 : 500);
            res.status(status).json({ error: e.message || 'Action failed' });
        }
    };
}

router.post('/friends/request', friendLimiter, handle('request', (s, t) => friends.request(s, t)));
router.post('/friends/respond', friendLimiter, async (req, res) => {
    try {
        const { signer, target } = await auth('respond', req.body);
        const result = await friends.respond(signer, target, req.body?.accept === true);
        res.json({ ok: true, ...result });
    } catch (e: any) {
        res.status(e.status || 400).json({ error: e.message || 'Action failed' });
    }
});
router.post('/friends/remove', friendLimiter, handle('remove', (s, t) => friends.remove(s, t)));
router.post('/friends/block', friendLimiter, handle('block', (s, t) => friends.block(s, t)));
router.post('/friends/unblock', friendLimiter, handle('unblock', (s, t) => friends.unblock(s, t)));

export default router;
