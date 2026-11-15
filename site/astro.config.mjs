import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const directives = {
  name: 'hullo-directives',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'press', entrypoint: fileURLToPath(new URL('./src/directives/press.js', import.meta.url)) });
    },
  },
};

export default defineConfig({
  site: process.env.URL ?? 'https://sayhullo.netlify.app',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [react(), directives],
  vite: {
    plugins: [tailwindcss()],
  },
});
