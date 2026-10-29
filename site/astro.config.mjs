import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://sohan-bhat.github.io',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  integrations: [react()],
});
