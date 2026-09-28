import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  // HTTPS con certificado autofirmado local: necesario para probar la cámara
  // desde el celular (getUserMedia exige contexto seguro). Ejecutar con
  // `npm run dev -- --host` para exponer el servidor en la red local.
  server: {
    https: {},
    host: true,
  },
  plugins: [react(), tailwindcss(), basicSsl()],
});