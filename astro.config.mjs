import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://bokepterbaruindonesia.pages.dev',
  output: 'server',
  adapter: cloudflare(),
});