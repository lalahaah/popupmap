import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculatePopupStatus } from "@/lib/status";
import { geocode } from "@/lib/geocode";

export const dynamic = 'force-dynamic';

const popupSchema = z.object({
  name: z.string(),
  brandId: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(["FASHION", "BEAUTY", "FOOD", "GOODS", "EXHIBIT", "ETC"]),
  address: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.enum(["upcoming", "ongoing", "ended"]).default("upcoming"),
  sourceType: z.enum(["manual", "user_submit", "brand_official"]),
  sourceUrl: z.string().optional(),
  images: z.array(z.string()).default([]),
  isSponsored: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsedData = popupSchema.parse(body);

    const status = calculatePopupStatus(parsedData.startDate, parsedData.endDate);

    let lat = parsedData.lat;
    let lng = parsedData.lng;

    if (lat === undefined || lng === undefined) {
      const coords = await geocode(parsedData.address);
      if (!coords) {
        return NextResponse.json({ error: "주소의 위도/경도를 찾을 수 없습니다. 정확한 주소를 입력해주세요." }, { status: 400 });
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    // Brand upsert (since POST /api/popups takes brandId, but AdminPopupForm provides brand string)
    // Wait, AdminPopupForm provides `brand` as a string, but POST /api/popups expects `brandId`.
    // Let's modify POST /api/popups to accept `brand` string and upsert it, just like PATCH does.
    let brandId = parsedData.brandId;
    if ((parsedData as any).brand && !brandId) {
      const brandName = (parsedData as any).brand;
      let brand = await prisma.brand.findFirst({
        where: { name: brandName },
      });
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: brandName },
        });
      }
      brandId = brand.id;
    }

    const { brand: _brand, ...dataForPopup } = parsedData;

    const popup = await prisma.popup.create({
      data: {
        ...dataForPopup,
        lat: lat!,
        lng: lng!,
        brandId: brandId,
        status: status,
      }
    });

    return NextResponse.json(popup, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/popups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in km
  return d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius") || "5";
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  if (!q && (!latStr || !lngStr)) {
    return NextResponse.json({ error: "Missing lat or lng parameters" }, { status: 400 });
  }

  const where: any = {};
  if (category) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } }
    ];
  }

  try {
    // 향후 데이터가 많아지면 PostGIS 확장으로 쿼리 레벨에서 반경 검색을 처리할 예정입니다.
    // 현재는 데이터가 적어 애플리케이션 레벨에서 필터링합니다.
    const allPopups = await prisma.popup.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
        lat: true,
        lng: true,
        startDate: true,
        endDate: true,
        status: true,
        images: true,
        description: true,
        sourceUrl: true,
        viewCount: true,
      }
    });

    let popups = allPopups;

    if (!q) {
      const lat = parseFloat(latStr!);
      const lng = parseFloat(lngStr!);
      const radius = parseFloat(radiusStr);

      if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        return NextResponse.json({ error: "Invalid lat, lng or radius parameters" }, { status: 400 });
      }

      popups = allPopups.filter(popup => {
        const distance = getDistance(lat, lng, popup.lat, popup.lng);
        return distance <= radius;
      });
    }

    return NextResponse.json({ popups });
  } catch (error) {
    console.error("GET /api/popups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
