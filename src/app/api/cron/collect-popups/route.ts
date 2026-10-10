import { NextResponse } from 'next/server';
import { runCollector } from '@/lib/collector/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === '1';

    const result = await runCollector({ dryRun });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Collect popups cron error:', error);
    let errorMessage = error?.message || 'Internal Server Error';
    if (process.env.GEMINI_API_KEY) {
      errorMessage = errorMessage.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED]');
    }
    if (process.env.CRON_SECRET) {
      errorMessage = errorMessage.replaceAll(process.env.CRON_SECRET, '[REDACTED]');
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
