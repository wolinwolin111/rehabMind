import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const modelRevision = createHash('sha256');
for (const file of ['skin.json', 'skin.pack', 'bones.pack', 'features.pack', 'muscles.pack', 'tendons.pack', 'surface_atlas.bin', 'display-manifest.json']) {
  modelRevision.update(readFileSync(new URL(`./public/3d/${file}`, import.meta.url)));
}

export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_MODEL_ASSET_REVISION': JSON.stringify(modelRevision.digest('hex').slice(0, 16)) },
  base: process.env.VITE_BASE_PATH || '/',
  build: { outDir: 'build/web', emptyOutDir: true },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
});
