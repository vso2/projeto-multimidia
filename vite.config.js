import { defineConfig } from 'vite';

export default defineConfig({
  base: '/prototipo-multimidia/', // Change this to your GitHub repository name
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});

