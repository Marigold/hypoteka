// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { rehypeBaseUrl } from './src/plugins/rehype-base-url';

// https://astro.build/config
export default defineConfig({
  site: 'https://marigold.github.io',
  base: '/hypoteka',
  integrations: [mdx({ rehypePlugins: [[rehypeBaseUrl, '/hypoteka']] }), sitemap(), react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        allow: ['..', '../..', '../../..', '../../../..']
      }
    }
  }
});