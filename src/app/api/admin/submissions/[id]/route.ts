import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const approveSchema = z.object({
  action: z.literal('approve'),
  editedData: z.object({
    name: z.string(),
    brand: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(['FASHION', 'BEAUTY', 'FOOD', 'GOODS', 'EXHIBIT', 'ETC']),
    address: z.string(),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    sourceType: z.enum(['manual', 'user_submit', 'brand_official']).default('user_submit'),
    sourceUrl: z.string().min(1, '원문 링크는 필수입니다.'),
    images: z.array(z.string()).default([]),
    isSponsored: z.boolean().default(false),
  }),
});

const rejectSchema = z.object({
  action: z.literal('reject'),
});

const actionSchema = z.union([approveSchema, rejectSchema]);

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("KAKAO_REST_API_KEY가 설정되어 있지 않습니다.");
    return null;
  }

  const headers = { Authorization: `KakaoAK ${apiKey}` };

  // 1. 주소 검색
  try {
    const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, { headers });
    if (addrRes.ok) {
      const data = await addrRes.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      }
    }
  } catch (error) {
    console.error(`주소 검색 요청 실패:`, error);
  }

  // 2. 키워드 검색
  try {
    const searchKeyword = address.replace(/\s+[B\d]+층.*/, '');
    const keywordRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchKeyword)}`, { headers });
    if (keywordRes.ok) {
      const data = await keywordRes.json();
      if (data.documents && data.documents.length > 0) {
        return {
          lat: parseFloat(data.documents[0].y),
          lng: parseFloat(data.documents[0].x),
        };
      }
    }
  } catch (error) {
    console.error(`키워드 검색 요청 실패:`, error);
  }

  return null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = actionSchema.parse(body);

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    });

    if (!submission) {
      return NextResponse.json({ error: '제보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (parsed.action === 'reject') {
      await prisma.submission.update({
        where: { id: params.id },
        data: { status: 'rejected' },
      });
      return NextResponse.json({ status: 'rejected' });
    }

    // action === 'approve'
    const { editedData } = parsed;

    // 지오코딩
    const coords = await geocode(editedData.address);
    if (!coords) {
      return NextResponse.json({ error: '주소의 위도/경도를 찾을 수 없습니다. 정확한 주소를 입력해주세요.' }, { status: 400 });
    }

    // Brand upsert
    let brandId = null;
    if (editedData.brand) {
      let brand = await prisma.brand.findFirst({
        where: { name: editedData.brand },
      });
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: editedData.brand },
        });
      }
      brandId = brand.id;
    }

    // Popup 생성
    const popup = await prisma.popup.create({
      data: {
        name: editedData.name,
        brandId,
        description: editedData.description,
        category: editedData.category,
        address: editedData.address,
        lat: coords.lat,
        lng: coords.lng,
        startDate: editedData.startDate,
        endDate: editedData.endDate,
        sourceType: editedData.sourceType,
        sourceUrl: editedData.sourceUrl,
        images: editedData.images,
        isSponsored: editedData.isSponsored,
      },
    });

    // Submission 상태 업데이트
    await prisma.submission.update({
      where: { id: params.id },
      data: { status: 'approved' },
    });

    return NextResponse.json({ status: 'approved', popup });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값이 올바르지 않습니다.', details: error.errors }, { status: 400 });
    }
    console.error('PATCH /api/admin/submissions/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
