import { prisma } from '@/lib/prisma';
import PopupsClient from './PopupsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPopupsPage() {
  const initialPopups = await prisma.popup.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      brand: true,
    },
  });

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto">
        <PopupsClient initialPopups={initialPopups} />
      </div>
    </div>
  );
}
