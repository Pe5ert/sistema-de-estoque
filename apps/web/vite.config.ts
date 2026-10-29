import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Proxy de /api para a API local: front e API na mesma origem (necessário no Codespaces,
// onde cada porta vira um site diferente e o cookie SameSite=Lax não seria enviado).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
const shared = {
  proxy: { '/api': { target: apiTarget, changeOrigin: false } },
  allowedHosts: ['.app.github.dev'],
};

export default defineConfig({
  envDir: '../../',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, ...shared },
  preview: { port: 5173, ...shared },
});
