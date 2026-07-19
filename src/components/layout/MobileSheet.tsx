'use client';

import React, { useState } from 'react';
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
  const [expanded, setExpanded] = useState(true);

  const newCount = popups.filter(p => {
    if (!p.startDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(p.startDate);
    start.setHours(0,0,0,0);
    const diffDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 1;
  }).length;

  return (
    <div 
      className="mobile-sheet md:hidden flex flex-col fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink z-30 rounded-t-2xl overflow-hidden transition-all duration-300 shadow-[0_-4px_0_theme(colors.ink)]"
      style={{ height: expanded ? '70%' : '18%' }}
    >
      <div 
        className="flex justify-center pt-2 pb-1 cursor-pointer" 
        id="sheetHandle"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-1.5 bg-ink rounded-full"></div>
      </div>
      
      <div className="px-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="font-display text-lg tracking-tight">POPUP MAP</h1>
        <div className="stub px-2 py-1 text-[10px] font-mono font-bold">오늘 {newCount}곳 NEW</div>
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
