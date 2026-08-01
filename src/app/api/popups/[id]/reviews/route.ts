import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  nickname: z.string().min(1, '닉네임을 입력해주세요.').max(20, '닉네임은 20자 이내로 입력해주세요.'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, '리뷰 내용을 입력해주세요.').max(300, '리뷰는 300자 이내로 입력해주세요.'),
});

// Rate limit: memory-based, reset daily.
const rateLimitMap = new Map<string, { count: number; date: string }>();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const reviews = await prisma.review.findMany({
      where: { popupId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Fetch Reviews Error:', error);
    return NextResponse.json({ error: '리뷰를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const today = new Date().toISOString().split('T')[0];

    const userLimit = rateLimitMap.get(ip);
    if (userLimit && userLimit.date === today) {
      if (userLimit.count >= 10) {
        return NextResponse.json({ error: '하루 리뷰 작성 횟수(10회)를 초과했습니다.' }, { status: 429 });
      }
      userLimit.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, date: today });
    }

    const body = await req.json();
    const data = reviewSchema.parse(body);

    const review = await prisma.review.create({
      data: {
        popupId: params.id,
        nickname: data.nickname,
        rating: data.rating,
        comment: data.comment,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값이 올바르지 않습니다.', details: error.errors }, { status: 400 });
    }
    console.error('Review Create Error:', error);
    return NextResponse.json({ error: '리뷰 작성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
