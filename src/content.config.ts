import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    pubDate: z.coerce.date(),
    lastUpdated: z.coerce.date().optional(),
    category: z.string(),
    keywords: z.array(z.string()),
    disclaimer: z.boolean().default(true),
  }),
});

export const collections = { articles };
