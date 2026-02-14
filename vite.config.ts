/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Optional: only available when devDependencies are installed
let visualizer: any;
try {
    visualizer = (await import('rollup-plugin-visualizer')).visualizer;
} catch {
    // Not available in production builds (Netlify skips devDependencies)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite Configuration - AAA Quality Setup
 * 
 * Features:
 * - TypeScript support with path aliases
 * - Vitest for unit testing
 * - Optimized build settings
 * - Development server configuration
 * - Bundle analysis with visualizer
 */
export default defineConfig({
    plugins: [
        react(),

        // Bundle Visualizer - generates stats.html (dev only)
        visualizer?.({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap'
        })
    ].filter(Boolean),

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
            '@design-system': path.resolve(__dirname, './src/design-system'),
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
        chunkSizeWarningLimit: 1000, // Warn if chunk > 1MB
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core - ~130KB
                    'react-vendor': ['react', 'react-dom'],

                    // React Router - ~20KB
                    'router': ['react-router-dom'],

                    // Game Engine - ~50KB
                    'game-engine': [
                        './src/engine/gameLogic',
                        './src/engine/aiEngine',
                        './src/engine/movementEngine',
                        './src/engine/constants'
                    ],

                    // Web3 & Socket - ~200KB
                    'web3-vendor': ['ethers', 'thirdweb'],
                    'socket-vendor': ['socket.io-client'],

                    // Animations - ~80KB
                    'animation-vendor': ['framer-motion'],

                    // State Management - ~5KB
                    'state-vendor': ['zustand']
                },
                // Better filenames for cache busting
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        // Minification settings
        minify: 'esbuild',
        cssMinify: true,
    },

    /* Production Console Removal */
    esbuild: {
        drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
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
} as any);
