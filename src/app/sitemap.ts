import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.popupmap.app';

  let popupEntries: MetadataRoute.Sitemap = [];
  try {
    const popups = await prisma.popup.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
    });

    popupEntries = popups.map((popup) => ({
      url: `${baseUrl}/popup/${popup.id}`,
      lastModified: popup.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[sitemap] Failed to generate dynamic sitemap entries from Prisma:', error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...popupEntries,
  ];
}
