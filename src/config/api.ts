/**
 * API Configuration
 * 
 * Centralized API URL configuration for production/development
 */

// Get API URL from environment variable or fallback to Railway production
const RAILWAY_URL: string = 'https://goludo-v2-production.up.railway.app';
let rawUrl: string = (import.meta as any).env.VITE_API_URL || RAILWAY_URL;

// Ensure URL starts with protocol (prevents relative path 404s)
if (rawUrl && !rawUrl.startsWith('http')) {
    rawUrl = `https://${rawUrl}`;
}

export const API_URL: string = rawUrl;

// Socket.IO server URL (same as API)
export const SOCKET_URL: string = API_URL;
