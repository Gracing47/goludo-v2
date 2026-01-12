/**
 * API Configuration
 * 
 * Centralized API URL configuration for production/development
 */

// Get API URL from environment variable or fallback to localhost
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// Socket.IO server URL (same as API)
export const SOCKET_URL = API_URL;
