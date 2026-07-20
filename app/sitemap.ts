import { MetadataRoute } from 'next';
import { defaultBooks } from './data/defaultBooks';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://progressive-study-companion.pages.dev';

  // Base routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Dynamic course routes
  const courseRoutes = defaultBooks.map((book) => ({
    url: `${baseUrl}/course/${book.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...routes, ...courseRoutes];
}
