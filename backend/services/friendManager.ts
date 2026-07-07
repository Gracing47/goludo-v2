/**
 * FriendManager (G-030) — friendship graph on the unordered address pair.
 *
 * Security/rules baked in per Daniel's hardening:
 *  - Every mutation is authenticated by the caller via the G-032 signed-action
 *    flow (route layer) — this service trusts the already-verified signer.
 *  - Block hides presence both ways, ends any friendship, and a blocked user
 *    cannot re-request (they get the same "pending" shape, learning nothing).
 *  - Presence (online) is resolved by the caller from the socket registry and
 *    only exposed for accepted friends.
 */
import { getPrisma } from './profileManager.js';

const norm = (a: string) => a.toLowerCase();
/** unordered pair key */
function pair(a: string, b: string): { addrLow: string; addrHigh: string } {
    const x = norm(a), y = norm(b);
    return x < y ? { addrLow: x, addrHigh: y } : { addrLow: y, addrHigh: x };
}

export class FriendManager {
    private static _i: FriendManager;
    static getInstance() { return (this._i ??= new FriendManager()); }

    /** Send/refresh a friend request from `me` to `other`. */
    async request(me: string, other: string) {
        if (norm(me) === norm(other)) { const e: any = new Error('Cannot friend yourself'); e.code = 'SELF'; throw e; }
        const prisma = await getPrisma();
        if (!prisma) throw new Error('DB unavailable');
        const key = pair(me, other);
        const existing = await prisma.friendship.findUnique({ where: { addrLow_addrHigh: key } });

        if (existing) {
            if (existing.status === 'blocked') {
                // Blocked either way → silently report "pending" (Daniel: reveal nothing).
                return { status: 'pending' };
            }
            if (existing.status === 'accepted') return { status: 'accepted' };
            // pending exists: if the OTHER side requested earlier, this accepts it.
            if (norm(existing.requester) !== norm(me)) {
                const upd = await prisma.friendship.update({ where: { addrLow_addrHigh: key }, data: { status: 'accepted' } });
                return { status: upd.status };
            }
            return { status: 'pending' };
        }

        try {
            await prisma.friendship.create({ data: { ...key, requester: norm(me), status: 'pending' } });
            return { status: 'pending' };
        } catch (e: any) {
            // Daniel W1: concurrent A→B / B→A hit the unique constraint (P2002).
            // Re-read and apply the auto-accept path idempotently.
            if (e?.code === 'P2002') {
                const now = await prisma.friendship.findUnique({ where: { addrLow_addrHigh: key } });
                if (now && now.status === 'pending' && norm(now.requester) !== norm(me)) {
                    const upd = await prisma.friendship.update({ where: { addrLow_addrHigh: key }, data: { status: 'accepted' } });
                    return { status: upd.status };
                }
                return { status: now?.status || 'pending' };
            }
            throw e;
        }
    }

    /** Accept or reject a pending request addressed to `me`. */
    async respond(me: string, other: string, accept: boolean) {
        const prisma = await getPrisma();
        if (!prisma) throw new Error('DB unavailable');
        const key = pair(me, other);
        const row = await prisma.friendship.findUnique({ where: { addrLow_addrHigh: key } });
        if (!row || row.status !== 'pending') { const e: any = new Error('No pending request'); e.code = 'NONE'; throw e; }
        if (norm(row.requester) === norm(me)) { const e: any = new Error('You sent this request'); e.code = 'OWN'; throw e; }
        if (accept) {
            await prisma.friendship.update({ where: { addrLow_addrHigh: key }, data: { status: 'accepted' } });
            return { status: 'accepted' };
        }
        await prisma.friendship.delete({ where: { addrLow_addrHigh: key } });
        return { status: 'rejected' };
    }

    /** Remove a friendship (hard delete — DSGVO-friendly). */
    async remove(me: string, other: string) {
        const prisma = await getPrisma();
        if (!prisma) throw new Error('DB unavailable');
        const key = pair(me, other);
        await prisma.friendship.deleteMany({ where: { ...key, status: { in: ['pending', 'accepted'] } } });
        return { ok: true };
    }

    /** Block `other`: ends friendship, hides presence, prevents re-request. */
    async block(me: string, other: string) {
        const prisma = await getPrisma();
        if (!prisma) throw new Error('DB unavailable');
        const key = pair(me, other);
        await prisma.friendship.upsert({
            where: { addrLow_addrHigh: key },
            create: { ...key, requester: norm(me), status: 'blocked', blockedBy: norm(me) },
            update: { status: 'blocked', blockedBy: norm(me) },
        });
        return { ok: true };
    }

    /** Unblock — only the blocker can lift it; leaves no relationship behind. */
    async unblock(me: string, other: string) {
        const prisma = await getPrisma();
        if (!prisma) throw new Error('DB unavailable');
        const key = pair(me, other);
        const row = await prisma.friendship.findUnique({ where: { addrLow_addrHigh: key } });
        if (row?.status === 'blocked' && norm(row.blockedBy || '') === norm(me)) {
            await prisma.friendship.delete({ where: { addrLow_addrHigh: key } });
        }
        return { ok: true };
    }

    /** Is `me` blocked from interacting with `other` (either direction)? */
    async isBlocked(me: string, other: string): Promise<boolean> {
        const prisma = await getPrisma();
        if (!prisma) return false;
        const row = await prisma.friendship.findUnique({ where: { addrLow_addrHigh: pair(me, other) } });
        return row?.status === 'blocked';
    }

    /**
     * Full friend view for `me`: accepted friends, incoming + outgoing pending.
     * Usernames/avatars are resolved by the route; presence by the caller.
     */
    async list(me: string) {
        const prisma = await getPrisma();
        if (!prisma) return { friends: [], incoming: [], outgoing: [] };
        const m = norm(me);
        const rows = await prisma.friendship.findMany({
            where: { OR: [{ addrLow: m }, { addrHigh: m }], status: { in: ['pending', 'accepted'] } },
        });
        const friends: string[] = [];
        const incoming: string[] = [];
        const outgoing: string[] = [];
        for (const r of rows) {
            const other = norm(r.addrLow) === m ? r.addrHigh : r.addrLow;
            if (r.status === 'accepted') friends.push(other);
            else if (norm(r.requester) === m) outgoing.push(other);
            else incoming.push(other);
        }
        return { friends, incoming, outgoing };
    }
}
