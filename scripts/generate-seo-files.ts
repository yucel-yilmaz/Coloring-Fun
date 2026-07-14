import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ANIMALS } from '../src/data';

const siteUrl = (process.env.VITE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const publicRoutes = ['/'];
const privateRoutes = ['/login', '/create', '/gallery', '/settings', '/admin'];
const curatedColorRoutes = ANIMALS.filter((animal) => animal.source === 'curated').map((animal) => `/color/${animal.id}`);

async function writeRobotsTxt() {
  const lines = [
    'User-agent: *',
    ...privateRoutes.map((route) => `Disallow: ${route}`),
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ];
  await writeFile(resolve('public/robots.txt'), lines.join('\n'));
}

async function writeSitemap() {
  const urls = [...publicRoutes, ...curatedColorRoutes];
  const body = urls.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await writeFile(resolve('public/sitemap.xml'), xml);
}

await writeRobotsTxt();
await writeSitemap();
console.log(`Generated public/robots.txt and public/sitemap.xml (${curatedColorRoutes.length + publicRoutes.length} URLs) for ${siteUrl}`);
