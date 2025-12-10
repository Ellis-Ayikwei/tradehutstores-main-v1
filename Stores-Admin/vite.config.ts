import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        port: 5174,
        host: true,
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    antd: ['antd'],
                    'react-vendor': ['react', 'react-dom'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['antd'],
        esbuildOptions: {
            target: 'es2020',
        },
    },
});
