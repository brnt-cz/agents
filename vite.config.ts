import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import agentEvents from './src/vite-plugin-agent-events'

export default defineConfig({
  server: {
    port: 6660,
  },
  plugins: [
    vue(),
    tailwindcss(),
    agentEvents(),
  ],
})
