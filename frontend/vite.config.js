import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'http://192.168.50.100';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/data':    { target, changeOrigin: true },
            '/events':  { target, changeOrigin: true },
            '/history': { target, changeOrigin: true },
            '/pause':   { target, changeOrigin: true },
            '/restart': { target, changeOrigin: true },
            '/run':     { target, changeOrigin: true },
            '/resume':  { target, changeOrigin: true },
            '/settings': { target, changeOrigin: true },
            '/clear':   { target, changeOrigin: true },
        },
    },
});
