import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react/dist';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
  },
});
