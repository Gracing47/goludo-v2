import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite Configuration - AAA Quality Setup
 * 
 * Features:
 * - TypeScript support with path aliases
 * - Vitest for unit testing
 * - Optimized build settings
 * - Development server configuration
 */
export default defineConfig({
    plugins: [react()],

    /* Path Aliases - Clean Imports */
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@store': path.resolve(__dirname, './src/store'),
            '@engine': path.resolve(__dirname, './src/engine'),
            '@services': path.resolve(__dirname, './src/services'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@types': path.resolve(__dirname, './src/types'),
            '@config': path.resolve(__dirname, './src/config'),
        }
    },

    /* Development Server */
    server: {
        port: 3000,
        open: true,
        host: true // Allow network access for mobile testing
    },

    /* Build Optimization */
    build: {
        target: 'es2020',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'game-engine': ['./src/engine/gameLogic', './src/engine/aiEngine'],
                    'web3-vendor': ['ethers', 'socket.io-client']
                }
            }
        }
    },

    /* Vitest Configuration */
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData',
                'src/main.tsx'
            ]
        }
    }
});
