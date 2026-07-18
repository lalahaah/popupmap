import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const popupSchema = z.object({
  name: z.string(),
  brandId: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(["FASHION", "BEAUTY", "FOOD", "GOODS", "EXHIBIT", "ETC"]),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
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

    const popup = await prisma.popup.create({
      data: parsedData,
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
