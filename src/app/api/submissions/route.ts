import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const submissionSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  address: z.string().min(1, '주소를 입력해주세요.'),
  category: z.enum(['FASHION', 'BEAUTY', 'FOOD', 'GOODS', 'EXHIBIT', 'ETC']),
  startDate: z.string().min(1, '시작일을 입력해주세요.'),
  endDate: z.string().nullable().optional(),
  submitterContact: z.string().nullable().optional(),
});

// Rate limit: memory-based, reset daily.
// TODO: Replace with Redis for distributed environments if needed.
const rateLimitMap = new Map<string, { count: number; date: string }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const today = new Date().toISOString().split('T')[0];

    const userLimit = rateLimitMap.get(ip);
    if (userLimit && userLimit.date === today) {
      if (userLimit.count >= 5) {
        return NextResponse.json({ error: '하루 제보 횟수(5회)를 초과했습니다.' }, { status: 429 });
      }
      userLimit.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, date: today });
    }

    const body = await req.json();
    const data = submissionSchema.parse(body);

    const submission = await prisma.submission.create({
      data: {
        popupData: {
          name: data.name,
          address: data.address,
          category: data.category,
          startDate: data.startDate,
          endDate: data.endDate || null,
        },
        submitterContact: data.submitterContact || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ status: 'pending', id: submission.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값이 올바르지 않습니다.', details: error.errors }, { status: 400 });
    }
    console.error('Submission Error:', error);
    return NextResponse.json({ error: '제보 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
