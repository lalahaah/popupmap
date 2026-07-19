'use client';

import React, { useState, useRef } from 'react';
import { PopupCard } from '../list/PopupCard';
import { Popup } from '@/types/popup';

interface MobileSheetProps {
  popups: Popup[];
  category: string;
  onCategoryChange: (category: string) => void;
  onSelectPopup: (popup: Popup) => void;
}

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '패션', value: 'FASHION' },
  { label: '뷰티', value: 'BEAUTY' },
  { label: 'F&B', value: 'FOOD' },
  { label: '굿즈', value: 'GOODS' },
  { label: '전시', value: 'EXHIBIT' },
  { label: '기타', value: 'ETC' },
];

export function MobileSheet({ popups, category, onCategoryChange, onSelectPopup }: MobileSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = expanded ? window.innerHeight * 0.7 : window.innerHeight * 0.18;
    setDragHeight(startHeightRef.current);
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Only handle if we started a touch
    if (dragHeight === null && startYRef.current === 0) return;
    
    const deltaY = startYRef.current - e.touches[0].clientY;
    if (Math.abs(deltaY) > 5) {
      isDraggingRef.current = true;
    }

    const newHeight = startHeightRef.current + deltaY;
    const minHeight = window.innerHeight * 0.18;
    const maxHeight = window.innerHeight * 0.70;
    
    setDragHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
  };

  const handleTouchEnd = () => {
    if (dragHeight === null) return;
    
    if (isDraggingRef.current) {
      const threshold = window.innerHeight * 0.44;
      setExpanded(dragHeight > threshold);
    }
    setDragHeight(null);
  };

  const newCount = popups.filter(p => {
    if (!p.startDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(p.startDate);
    start.setHours(0,0,0,0);
    const diffDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 1;
  }).length;

  const currentHeight = dragHeight !== null ? `${dragHeight}px` : (expanded ? '70%' : '18%');

  return (
    <div 
      className={`mobile-sheet md:hidden flex flex-col fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink z-30 rounded-t-2xl overflow-hidden shadow-[0_-4px_0_theme(colors.ink)] ${dragHeight === null ? 'transition-all duration-300' : ''}`}
      style={{ height: currentHeight }}
    >
      {/* Header & Handle Area */}
      <div 
        className="cursor-pointer shrink-0 select-none active:bg-neutral-100 transition-colors touch-none"
        onClick={() => {
          if (!isDraggingRef.current) setExpanded(!expanded);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-2" id="sheetHandle">
          <div className="w-12 h-1.5 bg-ink rounded-full opacity-60"></div>
        </div>
        
        <div className="px-4 pb-3 flex items-center justify-between">
          <h1 className="font-display text-xl tracking-tight">POPUP MAP</h1>
          <div className="stub px-2 py-1 text-[10px] font-mono font-bold">오늘 {newCount}곳 NEW</div>
        </div>
      </div>
      
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.label}
            onClick={() => onCategoryChange(cat.value)}
            className={`chip px-3 py-1 text-[11px] font-bold border-2 border-ink shrink-0 ${category === cat.value ? 'bg-ink text-paper' : 'bg-white text-ink'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 space-y-3 bg-paper">
        {popups.map(popup => (
          <PopupCard 
            key={popup.id} 
            popup={popup} 
            onClick={() => onSelectPopup(popup)} 
          />
        ))}
        {popups.length === 0 && (
          <div className="text-center py-10 text-sm font-bold text-neutral-500">
            주변에 열려있는 팝업이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
