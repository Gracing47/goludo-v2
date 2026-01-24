/**
 * API Configuration
 * 
 * Centralized API URL configuration for production/development
 */

// Get API URL from environment variable or fallback to Railway production
const RAILWAY_URL = 'https://goludo-production.up.railway.app';
export const API_URL = import.meta.env.VITE_API_URL || RAILWAY_URL;

// Socket.IO server URL (same as API)
export const SOCKET_URL = API_URL;
