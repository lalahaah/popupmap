'use client';

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { KakaoMap } from "@/components/map/KakaoMap";
import { Popup } from "@/types/popup";

export default function Home() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [category, setCategory] = useState('');

  // 서울 중심 고정값
  const lat = 37.544;
  const lng = 127.055;
  const radius = 5;

  useEffect(() => {
    async function fetchPopups() {
      let url = `/api/popups?lat=${lat}&lng=${lng}&radius=${radius}`;
      if (category) {
        url += `&category=${category}`;
      }
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPopups(data.popups || []);
        }
      } catch (err) {
        console.error('Failed to fetch popups', err);
      }
    }
    fetchPopups();
  }, [category]);

  return (
    <div className="relative h-screen w-screen flex">
      <Sidebar popups={popups} category={category} onCategoryChange={setCategory} />
      {/* ===================== MAP AREA ===================== */}
      <main className="flex-1 relative h-full min-h-0 min-w-0">
        {/* top-right controls */}
        <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
          <button className="w-11 h-11 bg-card border-2 border-ink shadow-[3px_3px_0_theme(colors.ink)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
        </div>

        <KakaoMap popups={popups} />

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-card border-2 border-ink px-4 py-2 text-xs font-bold shadow-[3px_3px_0_theme(colors.ink)]">
          지도를 움직이면 이 지역 팝업으로 다시 검색
        </div>
      </main>
    </div>
  );
}
