import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lets VITE_API_URL=/api reach the backend through this dev server. The dev container
    // uses it because a browser on a Codespaces URL can't reach the container's localhost.
    proxy: {
      '/api': 'http://localhost:4000',
    },
    // Codespaces serves forwarded ports from *.app.github.dev.
    allowedHosts: ['.app.github.dev'],
  },
})
