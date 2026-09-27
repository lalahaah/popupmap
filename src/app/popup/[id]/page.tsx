import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  let popup = null;
  try {
    popup = await prisma.popup.findUnique({
      where: { id: params.id },
    });
  } catch (error) {
    console.error("Failed to fetch popup metadata:", error);
  }

  if (!popup) {
    return {
      title: "팝업을 찾을 수 없습니다 | 팝업맵",
    };
  }

  const title = `${popup.name} | 팝업맵`;
  const description =
    popup.description ||
    `${popup.name} - 전국 팝업스토어 실시간 지도 팝업맵에서 상세 일정과 위치를 확인하세요.`;
  const imageUrl =
    popup.images && popup.images.length > 0
      ? popup.images[1] || popup.images[0]
      : "/og-image.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: "website",
      url: `https://popupmap-blush.vercel.app/popup/${popup.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PopupPage({ params }: PageProps) {
  let popup = null;
  try {
    popup = await prisma.popup.findUnique({
      where: { id: params.id },
      include: { brand: true },
    });
  } catch (error) {
    console.error("Failed to fetch popup detail:", error);
  }

  if (!popup) {
    notFound();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = "";
  let isClosingSoon = false;
  let isNew = false;
  const isEnded =
    popup.status === "ended" ||
    (popup.endDate ? new Date(popup.endDate).getTime() < today.getTime() : false);

  if (isEnded) {
    dDayText = "END";
  } else if (popup.endDate) {
    const end = new Date(popup.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTimeEnd = end.getTime() - today.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (diffDaysEnd <= 3 && diffDaysEnd >= 0) {
      isClosingSoon = true;
      dDayText = `D-${diffDaysEnd === 0 ? "DAY" : diffDaysEnd}`;
    } else if (diffDaysEnd < 0) {
      dDayText = "END";
    } else {
      dDayText = `D-${diffDaysEnd}`;
    }
  }

  if (!isEnded && popup.startDate) {
    const start = new Date(popup.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTimeStart = today.getTime() - start.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));

    if (diffDaysStart >= 0 && diffDaysStart <= 1) {
      isNew = true;
      dDayText = "NEW";
    }
  }

  if (!dDayText) dDayText = "D-?";

  const categoryLabels: Record<string, string> = {
    FASHION: "패션",
    BEAUTY: "뷰티",
    FOOD: "F&B",
    GOODS: "굿즈",
    EXHIBIT: "전시",
    ETC: "기타",
  };

  const formatMonthDay = (date?: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const dateRange =
    popup.startDate && popup.endDate
      ? `${formatMonthDay(popup.startDate)} – ${formatMonthDay(popup.endDate)}`
      : popup.endDate
        ? `~ ${formatMonthDay(popup.endDate)}`
        : "상시운영";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center py-6 px-4 sm:py-10">
      {/* Top Header */}
      <header className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-2xl tracking-tight text-ink hover:opacity-80 transition-opacity"
        >
          <span>POPUPMAP</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-bold px-3 py-2 border-2 border-ink bg-card shadow-[2px_2px_0_theme(colors.ink)] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center gap-1"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          지도 홈으로
        </Link>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-2xl bg-card border-2 border-ink shadow-[6px_6px_0_theme(colors.ink)] flex flex-col overflow-hidden">
        {/* Ended Banner */}
        {isEnded && (
          <div className="bg-neutral-200 border-b-2 border-ink px-4 py-3 text-center text-sm font-bold text-neutral-700 flex items-center justify-center gap-2">
            <span className="text-base">⚠️</span>
            <span>이 팝업스토어는 운영이 종료되었습니다.</span>
          </div>
        )}

        {/* Hero Image */}
        <div className="relative w-full h-[260px] sm:h-[340px] bg-neutral-200 border-b-2 border-ink shrink-0 overflow-hidden">
          {popup.images && popup.images.length > 0 ? (
            <img
              src={popup.images[1] || popup.images[0]}
              alt={popup.name}
              className={`w-full h-full object-cover ${isEnded ? "grayscale opacity-75" : ""}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brandBlue to-brandRed" />
          )}

          {/* D-day Stub Badge */}
          <div
            className={`absolute -bottom-3.5 left-6 stub px-3.5 py-1.5 text-xs font-mono font-bold border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] ${
              isEnded
                ? "bg-neutral-400 !text-white"
                : isNew
                  ? "bg-brandRed !text-white"
                  : isClosingSoon
                    ? "bg-brandYellow text-ink"
                    : "bg-paper text-ink"
            }`}
          >
            {dDayText}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 pt-10 sm:p-8 sm:pt-12 flex-1 flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-brandYellow">
                {categoryLabels[popup.category] || "기타"}
              </span>
              {popup.brand?.name && (
                <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-paper text-neutral-700">
                  {popup.brand.name}
                </span>
              )}
              {isClosingSoon && !isEnded && (
                <span className="text-xs font-bold text-brandRed border-2 border-brandRed px-2 py-0.5 bg-red-50">
                  마감임박
                </span>
              )}
              {isEnded && (
                <span className="text-xs font-bold text-neutral-500 border-2 border-neutral-400 px-2 py-0.5 bg-neutral-100">
                  종료됨
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-4xl tracking-tight leading-tight mb-4">
              {popup.name}
            </h1>

            <div className="flex flex-col gap-2 pt-2 border-t-2 border-ink">
              <div className="flex items-start gap-2 text-sm font-bold text-neutral-700">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5 text-brandRed"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{popup.address || "주소 정보 없음"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm font-mono font-bold text-brandBlue">
                <svg
                  className="w-4 h-4 shrink-0 text-brandBlue"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{dateRange}</span>
              </div>
            </div>
          </div>

          {popup.description && (
            <div className="border-t-2 border-ink pt-6">
              <h2 className="font-bold mb-3 text-sm text-neutral-500 uppercase tracking-wider">
                상세 정보
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{popup.description}</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t-2 border-ink bg-paper flex flex-col sm:flex-row gap-3">
          <Link
            href={`/?highlight=${popup.id}`}
            className="flex-1 py-3.5 px-4 bg-brandYellow text-ink text-center font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all flex items-center justify-center gap-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            지도에서 보기
          </Link>

          {popup.sourceUrl && (
            <a
              href={popup.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3.5 px-4 bg-brandBlue text-white text-center font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>원문 보기</span>
              <span className="text-xs">↗</span>
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mt-8 text-center text-xs text-neutral-500 font-mono">
        © 2026 POPUPMAP. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
