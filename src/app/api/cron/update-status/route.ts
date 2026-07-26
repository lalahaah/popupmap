import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePopupStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Verify the authorization header against CRON_SECRET
    // The format is usually "Bearer <secret>"
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const popups = await prisma.popup.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      }
    });

    let checked = popups.length;
    let updated = 0;

    for (const popup of popups) {
      const newStatus = calculatePopupStatus(popup.startDate, popup.endDate);
      
      if (popup.status !== newStatus) {
        await prisma.popup.update({
          where: { id: popup.id },
          data: { status: newStatus }
        });
        updated++;
      }
    }

    return NextResponse.json({ checked, updated });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
