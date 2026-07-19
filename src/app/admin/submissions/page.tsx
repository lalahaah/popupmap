import { prisma } from '@/lib/prisma';
import SubmissionsClient from './SubmissionsClient';

// Server Component
export default async function AdminSubmissionsPage() {
  const pendingSubmissions = await prisma.submission.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl mb-8">제보 승인 대기열</h1>
        <SubmissionsClient initialSubmissions={pendingSubmissions} />
      </div>
    </div>
  );
}
