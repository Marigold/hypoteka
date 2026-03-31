/**
 * Prefix an internal path with the base URL for GitHub Pages compatibility.
 * Works in both .astro and .tsx files (Vite handles import.meta.env at build time).
 *
 * @example
 *   url('/kalkulacky')         → '/hypoteka/kalkulacky'
 *   url('/kalkulacky/stresovy-test') → '/hypoteka/kalkulacky/stresovy-test'
 *   url('/')                   → '/hypoteka/'
 */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}
