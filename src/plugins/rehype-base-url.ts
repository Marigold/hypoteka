import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that prefixes internal links with the Astro base URL.
 * This handles links in MDX content (articles) where we can't use the url() helper.
 */
export function rehypeBaseUrl(base: string) {
  const cleanBase = base.replace(/\/$/, '');

  return (tree: Root) => {
    if (!cleanBase) return;

    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties?.href) {
        const href = String(node.properties.href);
        // Only prefix internal absolute links that don't already have the base
        if (href.startsWith('/') && !href.startsWith(cleanBase + '/') && href !== cleanBase) {
          node.properties.href = `${cleanBase}${href}`;
        }
      }
    });
  };
}
