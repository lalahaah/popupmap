'use client';

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSheet } from "@/components/layout/MobileSheet";
import { KakaoMap } from "@/components/map/KakaoMap";
import { PopupDetail } from "@/components/detail/PopupDetail";
import { SubmissionForm } from "@/components/forms/SubmissionForm";
import { Popup } from "@/types/popup";

export default function Home() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('deadline'); // 'deadline' | 'new' | 'popular'
  const [selectedPopup, setSelectedPopup] = useState<Popup | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

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

  const sortedPopups = [...popups].sort((a, b) => {
    if (sortBy === 'deadline') {
      if (!a.endDate) return 1;
      if (!b.endDate) return -1;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    }
    if (sortBy === 'new') {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
    if (sortBy === 'popular') {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    return 0;
  });

  return (
    <div className="relative h-screen w-screen flex">
      <Sidebar 
        popups={sortedPopups} category={category} onCategoryChange={setCategory} 
        sortBy={sortBy} onSortChange={setSortBy}
        onSelectPopup={setSelectedPopup} 
        onOpenSubmissionForm={() => setShowSubmissionForm(true)}
      />
      <MobileSheet 
        popups={sortedPopups} category={category} onCategoryChange={setCategory} 
        sortBy={sortBy} onSortChange={setSortBy}
        onSelectPopup={setSelectedPopup} 
        onOpenSubmissionForm={() => setShowSubmissionForm(true)}
      />
      {/* ===================== MAP AREA ===================== */}
      <main className="flex-1 relative h-full min-h-0 min-w-0">
        {/* top-right controls */}
        <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
          <button className="w-11 h-11 bg-card border-2 border-ink shadow-[3px_3px_0_theme(colors.ink)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
        </div>

        <KakaoMap popups={popups} onSelectPopup={setSelectedPopup} />

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-card border-2 border-ink px-4 py-2 text-xs font-bold shadow-[3px_3px_0_theme(colors.ink)]">
          지도를 움직이면 이 지역 팝업으로 다시 검색
        </div>
      </main>

      {selectedPopup && (
        <PopupDetail 
          popup={selectedPopup} 
          onClose={() => setSelectedPopup(null)} 
        />
      )}

      {showSubmissionForm && (
        <SubmissionForm onClose={() => setShowSubmissionForm(false)} />
      )}
    </div>
  );
}
