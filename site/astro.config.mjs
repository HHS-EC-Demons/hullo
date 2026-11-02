import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const directives = {
  name: 'hullo-directives',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'idlemedia', entrypoint: fileURLToPath(new URL('./src/directives/idle-media.js', import.meta.url)) });
    },
  },
};

export default defineConfig({
  site: 'https://hhs-ec-demons.github.io',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  integrations: [react(), directives],
  vite: {
    plugins: [tailwindcss()],
  },
});
