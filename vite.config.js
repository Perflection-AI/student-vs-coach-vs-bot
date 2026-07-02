import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/0701_3P_Paradigm/',
  envPrefix: 'VITE_',
});
