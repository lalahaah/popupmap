'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { PopupCard } from '../list/PopupCard';
import { Popup } from '@/types/popup';
import { CATEGORIES, SORT_TABS } from '@/lib/constants';

interface MobileSheetProps {
  popups: Popup[];
  category: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectPopup: (popup: Popup) => void;
  onOpenSubmissionForm: () => void;
  highlightedPopupId?: string | null;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function MobileSheet({ popups, category, onCategoryChange, sortBy, onSortChange, searchQuery, onSearchChange, onSelectPopup, onOpenSubmissionForm, highlightedPopupId, isExpanded = false, onExpandedChange }: MobileSheetProps) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = isExpanded ? window.innerHeight * 0.7 : window.innerHeight * 0.25;
    setDragHeight(startHeightRef.current);
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragHeight === null && startYRef.current === 0) return;
    
    const deltaY = startYRef.current - e.touches[0].clientY;
    if (Math.abs(deltaY) > 5) {
      isDraggingRef.current = true;
    }

    const newHeight = startHeightRef.current + deltaY;
    const minHeight = window.innerHeight * 0.25;
    const maxHeight = window.innerHeight * 0.70;
    
    setDragHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
  };

  const handleTouchEnd = () => {
    if (dragHeight === null) return;
    
    if (isDraggingRef.current) {
      const threshold = window.innerHeight * 0.44;
      if (onExpandedChange) {
        onExpandedChange(dragHeight > threshold);
      }
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

  const currentHeight = dragHeight !== null ? `${dragHeight}px` : (isExpanded ? '70%' : '25%');

  return (
    <div 
      className={`mobile-sheet md:hidden flex flex-col fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink z-30 rounded-t-2xl overflow-hidden shadow-[0_-4px_0_theme(colors.ink)] ${dragHeight === null ? 'transition-all duration-300' : ''}`}
      style={{ height: currentHeight }}
    >
      {/* Header & Handle Area */}
      <div 
        className="cursor-pointer shrink-0 select-none active:bg-neutral-100 transition-colors touch-none"
        onClick={() => {
          if (!isDraggingRef.current && onExpandedChange) onExpandedChange(!isExpanded);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-2" id="sheetHandle">
          <div className="w-12 h-1.5 bg-ink rounded-full opacity-60"></div>
        </div>
        
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={28} height={28} />
            <h1 className="font-display text-xl tracking-tight">POPUP MAP</h1>
          </div>
          <div className="stub px-2 py-1 text-[10px] font-mono font-bold">오늘 {newCount}곳 NEW</div>
        </div>
      </div>
      
      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 border-2 border-ink px-3 py-2 bg-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            placeholder="브랜드 또는 지역 검색" 
            className="w-full bg-transparent outline-none text-xs font-bold placeholder:text-neutral-400"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
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

      <div className="px-4 py-2 border-b-2 border-ink flex gap-4 text-xs font-bold shrink-0">
        {SORT_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onSortChange(tab.value)}
            className={`${sortBy === tab.value ? 'text-brandRed underline decoration-2 underline-offset-4' : 'text-neutral-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 space-y-3 bg-paper">
        {popups.map(popup => (
          <PopupCard 
            key={popup.id} 
            popup={popup} 
            onClick={() => onSelectPopup(popup)} 
            isHighlighted={highlightedPopupId === popup.id}
          />
        ))}
        {popups.length === 0 && (
          <div className="text-center py-10 text-sm font-bold text-neutral-500">
            {searchQuery ? '검색 결과가 없습니다.' : '주변에 열려있는 팝업이 없습니다.'}
          </div>
        )}

        {/* CTA */}
        <button 
          onClick={onOpenSubmissionForm}
          className="w-full mt-2 mb-4 py-3 bg-brandRed text-white font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all"
        >
          + 팝업 제보하기
        </button>
      </div>
    </div>
  );
}
