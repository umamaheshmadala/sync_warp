
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.test.local or .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default defineConfig({
    test: {
        globals: true,
        environment: 'node', // Integration tests often run in Node to use admin client, but 'jsdom' is okay if we use fetch. Node is faster for DB ops. 
        // BUT we use supabase-js which works in both.
        include: ['src/integration/**/*.test.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
