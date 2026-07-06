/**
 * ProfileManager — Observer pattern for game stats
 *
 * Profiles are OBSERVERS, not PLAYERS.
 * If profile update fails, the game continues. Stats are eventually consistent.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient;
let prismaInitPromise: Promise<void> | null = null;

async function initPrisma() {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.warn('⚠️ DATABASE_URL is missing in environment variables.');
        prisma = null as any;
        return;
    }

    try {
        const maskedUrl = dbUrl.replace(/:[^@:]+@/, ':****@');
        console.log(`🔌 Initializing PrismaPg Adapter with URL: ${maskedUrl.split('@')[1]}`);

        // Prisma v7: PrismaPg manages its own connection pool internally
        const adapter = new PrismaPg({ connectionString: dbUrl });
        prisma = new PrismaClient({ adapter });

        console.log('✅ PrismaClient initialized with driver adapter');
    } catch (e: any) {
        console.warn('❌ Prisma init failed:', e.message);
        prisma = null as any;
    }
}

// Start async init
prismaInitPromise = initPrisma();

// ============================================
// TYPES
// ============================================

export interface GameResult {
    mode: 'classic' | 'rapid';
    result: 'win' | 'loss';
    wagered: bigint;
    won: bigint;
    gameDuration: number; // seconds
}

export interface GameHistoryData {
    roomId: string;
    mode: 'classic' | 'rapid';
    players: string[];
    winner: string;
    loser?: string;
    betAmount: bigint;
    payoutAmount: bigint;
    duration: number;
    totalTurns: number;
    startedAt: Date;
    endedAt: Date;
}

type LeaderboardMetric = 'totalWins' | 'classicWins' | 'rapidWins' | 'totalWon' | 'totalXp';

/**
 * Season 1 XP table (non-monetary progression; never redeemable for money).
 * Canonical values — resolves the discrepancy between the two source docs in favour
 * of the differentiated Season-1-Plan: a classic win rewards deeper strategic play,
 * and a loser never walks away with zero (loss-aversion mitigation).
 */
const XP_AWARD = {
    classic: { win: 250, loss: 40 },
    rapid: { win: 100, loss: 15 },
    // AI/Computer "Practice Mode": de-escalated so PvP (100–250) stays materially
    // more rewarding and there is no incentive to farm or to deliberately lose to bots.
    computer: { win: 20, loss: 5 },
} as const;

/** Max AI/Computer matches per UTC day that still award XP (anti-bot leaderboard guard). */
const DAILY_AI_XP_CAP = 3;

/** Current UTC day as YYYY-MM-DD — the reset key for the daily AI counter. */
function utcDay(): string {
    return new Date().toISOString().slice(0, 10);
}

// ============================================
// PROFILE MANAGER
// ============================================

export class ProfileManager {
    private static instance: ProfileManager;

    static getInstance(): ProfileManager {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }

    async getOrCreateProfile(walletAddress: string) {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) throw new Error('Prisma not initialized');

        const normalized = walletAddress.toLowerCase();

        let profile = await prisma.userProfile.findUnique({
            where: { walletAddress: normalized },
        });

        if (!profile) {
            profile = await prisma.userProfile.create({
                data: { walletAddress: normalized },
            });
        }

        return profile;
    }

    async updateStats(walletAddress: string, gameResult: GameResult) {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) return;

        const normalized = walletAddress.toLowerCase();
        const profile = await this.getOrCreateProfile(normalized);
        const isWin = gameResult.result === 'win';
        const prefix = gameResult.mode; // 'classic' | 'rapid'
        const xpGain = XP_AWARD[gameResult.mode][gameResult.result];

        // Build mode-specific field names
        const modeGames = `${prefix}GamesPlayed` as const;
        const modeWins = `${prefix}Wins` as const;
        const modeLosses = `${prefix}Losses` as const;
        const modeWagered = `${prefix}Wagered` as const;
        const modeWon = `${prefix}Won` as const;
        const modeBestTime = `${prefix}BestTime` as const;

        // Calculate new values
        const newStreak = isWin ? profile.currentStreak + 1 : 0;
        const newBestStreak = Math.max(newStreak, profile.bestStreak);

        const currentModeWagered = BigInt((profile as any)[modeWagered] ?? '0');
        const currentModeWon = BigInt((profile as any)[modeWon] ?? '0');
        const currentBestTime = (profile as any)[modeBestTime] as number | null;

        const update: any = {
            // Overall
            totalGamesPlayed: { increment: 1 },
            totalWagered: (BigInt(profile.totalWagered) + gameResult.wagered).toString(),
            totalWon: (BigInt(profile.totalWon) + gameResult.won).toString(),
            currentStreak: newStreak,
            bestStreak: newBestStreak,
            lastSeen: new Date(),
            totalXp: { increment: xpGain },

            // Mode-specific
            [modeGames]: { increment: 1 },
            [modeWagered]: (currentModeWagered + gameResult.wagered).toString(),
            [modeWon]: (currentModeWon + gameResult.won).toString(),
            [`${prefix}Xp`]: { increment: xpGain },
        };

        if (isWin) {
            update.totalWins = { increment: 1 };
            update[modeWins] = { increment: 1 };

            // Update best time (fastest win)
            if (!currentBestTime || gameResult.gameDuration < currentBestTime) {
                update[modeBestTime] = gameResult.gameDuration;
            }
        } else {
            update.totalLosses = { increment: 1 };
            update[modeLosses] = { increment: 1 };
        }

        return prisma.userProfile.update({
            where: { walletAddress: normalized },
            data: update,
        });
    }

    /**
     * Record a Player-vs-Computer (practice) match. Never touches LudoVault / $GO and
     * never mutates wagering or PvP win/loss stats — it only records de-escalated XP,
     * capped at DAILY_AI_XP_CAP matches per UTC day to stop bots farming the leaderboard.
     * Beyond the cap the match still "counts" (aiGamesPlayed) but awards 0 XP.
     */
    async recordAiMatch(
        walletAddress: string,
        result: 'win' | 'loss'
    ): Promise<{ xpAwarded: number; dailyCount: number; capped: boolean }> {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) return { xpAwarded: 0, dailyCount: 0, capped: false };

        const normalized = walletAddress.toLowerCase();
        const profile = await this.getOrCreateProfile(normalized);

        const today = utcDay();
        // Reset the daily counter when the UTC day has rolled over.
        const countSoFar = profile.dailyAiResetDate === today ? profile.dailyAiGamesCount : 0;

        const capped = countSoFar >= DAILY_AI_XP_CAP;
        const xpGain = capped ? 0 : XP_AWARD.computer[result];

        await prisma.userProfile.update({
            where: { walletAddress: normalized },
            data: {
                aiGamesPlayed: { increment: 1 },
                dailyAiGamesCount: countSoFar + 1,
                dailyAiResetDate: today,
                totalXp: { increment: xpGain },
                computerXp: { increment: xpGain },
                lastSeen: new Date(),
            },
        });

        return { xpAwarded: xpGain, dailyCount: countSoFar + 1, capped };
    }

    async saveGameHistory(data: GameHistoryData) {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) return;

        return prisma.gameHistory.create({
            data: {
                roomId: data.roomId,
                mode: data.mode,
                players: data.players,
                winner: data.winner.toLowerCase(),
                loser: data.loser?.toLowerCase(),
                betAmount: data.betAmount.toString(),
                payoutAmount: data.payoutAmount.toString(),
                duration: data.duration,
                totalTurns: data.totalTurns,
                startedAt: data.startedAt,
                endedAt: data.endedAt,
            },
        });
    }

    async getLeaderboard(metric: LeaderboardMetric, limit: number = 100) {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) return [];

        // Audit W1: totalWon is a wei STRING column — DB orderBy sorts it
        // lexicographically ("9…" > "10…"). Fetch a window and BigInt-sort in JS.
        if (metric === 'totalWon') {
            const rows = await prisma.userProfile.findMany({
                take: 500,
                select: {
                    walletAddress: true,
                    username: true,
                    totalWins: true,
                    classicWins: true,
                    rapidWins: true,
                    totalWon: true,
                    totalXp: true,
                    bestStreak: true,
                    classicBestTime: true,
                    rapidBestTime: true,
                },
            });
            const toBig = (v: string | null) => { try { return BigInt(v ?? '0'); } catch { return 0n; } };
            return rows
                .sort((a, b) => (toBig(b.totalWon) > toBig(a.totalWon) ? 1 : toBig(b.totalWon) < toBig(a.totalWon) ? -1 : 0))
                .slice(0, Math.min(limit, 100));
        }

        return prisma.userProfile.findMany({
            orderBy: { [metric]: 'desc' },
            take: Math.min(limit, 100),
            select: {
                walletAddress: true,
                username: true,
                totalWins: true,
                classicWins: true,
                rapidWins: true,
                totalWon: true,
                totalXp: true,
                bestStreak: true,
                classicBestTime: true,
                rapidBestTime: true,
            },
        });
    }

    async getPlayerStats(walletAddress: string) {
        if (prismaInitPromise) await prismaInitPromise;
        if (!prisma) throw new Error('Prisma not initialized');

        const normalized = walletAddress.toLowerCase();
        const profile = await this.getOrCreateProfile(normalized);

        const recentGames = await prisma.gameHistory.findMany({
            where: {
                // Audit B2: `players` is a Json column — the JsonFilter has no
                // `has` operator; that threw a ValidationError and 500'd every
                // /api/profile call. `array_contains` is the correct one.
                players: { array_contains: normalized },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const winRate = (count: number, total: number) =>
            total > 0 ? (count / total * 100).toFixed(1) : '0.0';

        return {
            profile,
            recentGames,
            winRate: winRate(profile.totalWins, profile.totalGamesPlayed),
            classicWinRate: winRate(profile.classicWins, profile.classicGamesPlayed),
            rapidWinRate: winRate(profile.rapidWins, profile.rapidGamesPlayed),
        };
    }

    async disconnect() {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}
