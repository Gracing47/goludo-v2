/**
 * API Configuration
 * 
 * Centralized API URL configuration for production/development
 */

// Get API URL from environment variable or fallback to Railway production
const RAILWAY_URL: string = 'https://goludo-v2-production.up.railway.app';
export const API_URL: string = (import.meta as any).env.VITE_API_URL || RAILWAY_URL;

// Socket.IO server URL (same as API)
export const SOCKET_URL: string = API_URL;
