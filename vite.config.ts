import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon-192.png','icons/icon-512.png','icons/lifty-symbol.png'],
    manifest: {
      name: 'LIFTY', short_name: 'LIFTY', description: 'Treinos, frequência, cardio e evolução corporal',
      theme_color: '#c8ff00', background_color: '#050505', display: 'standalone', start_url: './', scope: './',
      icons: [
        {src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},
        {src:'icons/icon-512.png',sizes:'512x512',type:'image/png'}
      ]
    }
  })]
})
