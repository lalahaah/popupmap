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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedPopup, setSelectedPopup] = useState<Popup | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [highlightedPopupId, setHighlightedPopupId] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showEnded, setShowEnded] = useState<boolean>(false);

  const [mapCenter, setMapCenter] = useState({ lat: 37.544, lng: 127.055 });
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const [tempCenter, setTempCenter] = useState<{lat: number, lng: number} | null>(null);

  const radius = 5;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchPopups() {
      const q = debouncedSearchQuery.trim();
      let url = q 
        ? `/api/popups?q=${encodeURIComponent(q)}` 
        : `/api/popups?lat=${mapCenter.lat}&lng=${mapCenter.lng}&radius=${radius}`;
      if (category) {
        url += `&category=${category}`;
      }
      if (showEnded && !q) {
        url += `&status=all`;
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
  }, [category, mapCenter, debouncedSearchQuery, showEnded]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("위치 정보를 지원하지 않는 브라우저입니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setHasMapMoved(false);
        setTempCenter(null);
      },
      (err) => {
        alert("위치 권한을 허용해주세요.");
      }
    );
  };

  const handleSearchArea = () => {
    if (hasMapMoved && tempCenter) {
      setMapCenter(tempCenter);
      setHasMapMoved(false);
      setTempCenter(null);
    }
  };

  const sortedPopups = [...popups].sort((a, b) => {
    // 1순위: 상태 (ended는 무조건 맨 아래)
    const aIsEnded = a.status === 'ended';
    const bIsEnded = b.status === 'ended';
    if (aIsEnded && !bIsEnded) return 1;
    if (!aIsEnded && bIsEnded) return -1;

    // 2순위: 기존 정렬 로직
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

  const handleSelectPopup = (popup: Popup, action: 'select' | 'showOnMap' = 'select') => {
    setHighlightedPopupId(popup.id);
    if (action === 'showOnMap') {
      setSelectedPopup(null);
      setIsSheetExpanded(false);
    } else {
      setSelectedPopup(popup);
    }
  };

  return (
    <div className="relative h-screen w-screen flex">
      <Sidebar 
        popups={sortedPopups} category={category} onCategoryChange={setCategory} 
        sortBy={sortBy} onSortChange={setSortBy}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onSelectPopup={handleSelectPopup} 
        onOpenSubmissionForm={() => setShowSubmissionForm(true)}
        highlightedPopupId={highlightedPopupId}
        showEnded={showEnded}
        onShowEndedChange={setShowEnded}
      />
      <MobileSheet 
        popups={sortedPopups} category={category} onCategoryChange={setCategory} 
        sortBy={sortBy} onSortChange={setSortBy}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onSelectPopup={handleSelectPopup} 
        onOpenSubmissionForm={() => setShowSubmissionForm(true)}
        highlightedPopupId={highlightedPopupId}
        isExpanded={isSheetExpanded}
        onExpandedChange={setIsSheetExpanded}
        showEnded={showEnded}
        onShowEndedChange={setShowEnded}
      />
      {/* ===================== MAP AREA ===================== */}
      <main className="flex-1 relative h-full min-h-0 min-w-0">
        {/* top-right controls */}
        <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
          <button 
            onClick={handleCurrentLocation}
            className="w-11 h-11 bg-card border-2 border-ink shadow-[3px_3px_0_theme(colors.ink)] flex items-center justify-center hover:bg-neutral-100 transition-colors"
            title="현재 위치"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
        </div>

        <KakaoMap 
          popups={popups} 
          onSelectPopup={handleSelectPopup} 
          highlightedPopupId={highlightedPopupId}
          mapCenter={mapCenter}
          onMapMoved={(lat, lng) => {
            setTempCenter({ lat, lng });
            setHasMapMoved(true);
          }}
        />

        <div 
          onClick={handleSearchArea}
          className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-10 border-2 border-ink px-4 py-2 text-xs font-bold shadow-[3px_3px_0_theme(colors.ink)] transition-all ${hasMapMoved ? 'bg-brandRed text-white cursor-pointer opacity-100 hover:scale-105' : 'bg-card text-ink opacity-60 pointer-events-none'}`}
        >
          지도를 움직이면 이 지역 팝업으로 다시 검색
        </div>
      </main>

      {selectedPopup && (
        <PopupDetail 
          popup={selectedPopup} 
          onClose={() => setSelectedPopup(null)} 
          onShowOnMap={() => handleSelectPopup(selectedPopup, 'showOnMap')}
        />
      )}

      {showSubmissionForm && (
        <SubmissionForm onClose={() => setShowSubmissionForm(false)} />
      )}
    </div>
  );
}
