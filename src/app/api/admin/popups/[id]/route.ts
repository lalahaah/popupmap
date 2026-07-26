import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculatePopupStatus } from '@/lib/status';
import { geocode } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['FASHION', 'BEAUTY', 'FOOD', 'GOODS', 'EXHIBIT', 'ETC']),
  address: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  sourceType: z.enum(['manual', 'user_submit', 'brand_official']).default('manual'),
  sourceUrl: z.string().optional(),
  images: z.array(z.string()).default([]),
  isSponsored: z.boolean().default(false),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsedData = updateSchema.parse(body);

    const existingPopup = await prisma.popup.findUnique({
      where: { id: params.id },
    });

    if (!existingPopup) {
      return NextResponse.json({ error: 'Popup not found' }, { status: 404 });
    }

    let lat = existingPopup.lat;
    let lng = existingPopup.lng;

    if (existingPopup.address !== parsedData.address) {
      const coords = await geocode(parsedData.address);
      if (!coords) {
        return NextResponse.json({ error: '주소의 위도/경도를 찾을 수 없습니다. 정확한 주소를 입력해주세요.' }, { status: 400 });
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    let brandId = existingPopup.brandId;
    if (parsedData.brand) {
      let brand = await prisma.brand.findFirst({
        where: { name: parsedData.brand },
      });
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: parsedData.brand },
        });
      }
      brandId = brand.id;
    } else {
      brandId = null;
    }

    const status = calculatePopupStatus(parsedData.startDate, parsedData.endDate);

    const updatedPopup = await prisma.popup.update({
      where: { id: params.id },
      data: {
        name: parsedData.name,
        brandId,
        description: parsedData.description,
        category: parsedData.category,
        address: parsedData.address,
        lat,
        lng,
        startDate: parsedData.startDate,
        endDate: parsedData.endDate,
        status,
        sourceType: parsedData.sourceType,
        sourceUrl: parsedData.sourceUrl,
        images: parsedData.images,
        isSponsored: parsedData.isSponsored,
      },
      include: {
        brand: true,
      },
    });

    return NextResponse.json(updatedPopup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('PATCH /api/admin/popups/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.popup.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/popups/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
