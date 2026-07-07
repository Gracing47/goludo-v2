/**
 * Avatar helper (G-028, DRY — used by profile, leaderboard, future friends list).
 *
 * DiceBear "bottts-neutral" (by Pablo Stanley — free for personal & commercial
 * use): deterministic SVG avatars, same seed → same avatar, no signup, no cost.
 * Seed = wallet address, so every player automatically has a stable identity.
 */
export function avatarUrl(seed?: string | null, size: number = 64): string {
    const s = encodeURIComponent((seed || 'goludo').toLowerCase());
    return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${s}&size=${size}`;
}
