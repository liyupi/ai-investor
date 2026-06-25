import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': 'http://localhost:8088',
      '/stop': 'http://localhost:8088',
      '/history': 'http://localhost:8088',
    },
  },
});
