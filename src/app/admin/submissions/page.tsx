import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SubmissionsClient from './SubmissionsClient';

// Server Component
export const dynamic = 'force-dynamic';

export default async function AdminSubmissionsPage() {
  const pendingSubmissions = await prisma.submission.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl">제보 승인 대기열</h1>
          <Link 
            href="/admin/new"
            className="px-4 py-2 bg-brandYellow border-2 border-ink font-bold shadow-[2px_2px_0_theme(colors.ink)] hover:bg-yellow-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            + 직접 등록
          </Link>
        </div>
        <SubmissionsClient initialSubmissions={pendingSubmissions} />
      </div>
    </div>
  );
}
