/**
 * ProfileManager — Observer pattern for game stats
 *
 * Profiles are OBSERVERS, not PLAYERS.
 * If profile update fails, the game continues. Stats are eventually consistent.
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
try {
    const dbUrl = process.env.DATABASE_URL;

    // Diagnostic logging for version
    import('@prisma/client').then(({ Prisma }) => {
        // @ts-ignore - access internal version
        console.log(`💎 Prisma Client Version: ${Prisma?.prismaVersion?.client ?? '7.x'}`);
    }).catch(() => { });

    if (!dbUrl) {
        console.warn('⚠️ DATABASE_URL is missing in environment variables.');
    } else {
        const maskedUrl = dbUrl.replace(/:[^@:]+@/, ':****@');
        console.log(`🔌 Initializing Prisma with URL: ${maskedUrl.split('@')[1]}`);
    }

    // @ts-ignore - datasourceUrl is the correct v7 way to pass URL
    prisma = new PrismaClient({
        datasourceUrl: dbUrl
    });
} catch (e: any) {
    console.warn('⚠️ Prisma init failed:', e.message);
    prisma = null as any;
}

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

type LeaderboardMetric = 'totalWins' | 'classicWins' | 'rapidWins' | 'totalWon';

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
        const normalized = walletAddress.toLowerCase();
        const profile = await this.getOrCreateProfile(normalized);
        const isWin = gameResult.result === 'win';
        const prefix = gameResult.mode; // 'classic' | 'rapid'

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

            // Mode-specific
            [modeGames]: { increment: 1 },
            [modeWagered]: (currentModeWagered + gameResult.wagered).toString(),
            [modeWon]: (currentModeWon + gameResult.won).toString(),
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

    async saveGameHistory(data: GameHistoryData) {
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
                bestStreak: true,
                classicBestTime: true,
                rapidBestTime: true,
            },
        });
    }

    async getPlayerStats(walletAddress: string) {
        const normalized = walletAddress.toLowerCase();
        const profile = await this.getOrCreateProfile(normalized);

        const recentGames = await prisma.gameHistory.findMany({
            where: {
                players: { array_contains: [normalized] },
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
        await prisma.$disconnect();
    }
}
