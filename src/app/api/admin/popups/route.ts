import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }

    const popups = await prisma.popup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ popups });
  } catch (error) {
    console.error('GET /api/admin/popups error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
