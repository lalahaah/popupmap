import React from 'react';
import { Popup } from '@/types/popup';

export function PopupCard({ popup }: { popup: Popup }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = '';
  let isClosingSoon = false;

  if (popup.endDate) {
    const end = new Date(popup.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTimeEnd = end.getTime() - today.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (diffDaysEnd <= 3 && diffDaysEnd >= 0) {
      isClosingSoon = true;
      dDayText = `D-${diffDaysEnd === 0 ? 'DAY' : diffDaysEnd}`;
    } else if (diffDaysEnd < 0) {
      dDayText = 'END';
    } else {
      dDayText = `D-${diffDaysEnd}`;
    }
  }

  let isNew = false;
  if (popup.startDate) {
    const start = new Date(popup.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTimeStart = today.getTime() - start.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    // 시작한지 1일 이내면 NEW (오늘이거나 어제)
    if (diffDaysStart >= 0 && diffDaysStart <= 1) {
      isNew = true;
      dDayText = 'NEW';
    }
  }

  // Fallback for missing dates
  if (!dDayText) dDayText = 'D-?';

  // Category Colors matching wireframe
  const categoryColors: Record<string, string> = {
    'FASHION': 'bg-brandYellow',
    'BEAUTY': 'bg-brandYellow',
    'FOOD': 'bg-brandYellow',
    'GOODS': 'bg-brandYellow',
    'EXHIBIT': 'bg-brandYellow',
    'ETC': 'bg-brandYellow',
  };
  const categoryBg = categoryColors[popup.category] || 'bg-paper';

  const categoryLabels: Record<string, string> = {
    'FASHION': '패션',
    'BEAUTY': '뷰티',
    'FOOD': 'F&B',
    'GOODS': '굿즈',
    'EXHIBIT': '전시',
    'ETC': '기타',
  };

  const formatMonthDay = (date?: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const dateRange = popup.startDate && popup.endDate 
    ? `${formatMonthDay(popup.startDate)} – ${formatMonthDay(popup.endDate)}`
    : popup.endDate 
      ? `~ ${formatMonthDay(popup.endDate)}` 
      : '상시운영';

  return (
    <div className="card-border bg-card p-3 flex gap-3 cursor-pointer transition-all border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] hover:shadow-[6px_6px_0_theme(colors.ink)] hover:-translate-x-[2px] hover:-translate-y-[2px]">
      <div className="relative w-20 h-20 shrink-0 bg-neutral-200 border-2 border-ink overflow-hidden">
        {popup.images && popup.images.length > 0 ? (
          <img src={popup.images[0]} alt={popup.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brandBlue to-brandRed"></div>
        )}
        <div className={`absolute -top-1 -left-1 stub px-1.5 py-0.5 text-[10px] font-mono ${isNew ? 'bg-brandRed !text-white' : ''}`}>
          {dDayText}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 border border-ink ${categoryBg}`}>
            {categoryLabels[popup.category] || '기타'}
          </span>
          {isClosingSoon && (
            <span className="text-[10px] font-bold text-brandRed">마감임박</span>
          )}
        </div>
        <p className="font-bold text-sm mt-1 truncate">{popup.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5 truncate">{popup.address || '주소 정보 없음'}</p>
        <p className="text-[11px] font-mono font-medium text-neutral-400 mt-1">{dateRange}</p>
      </div>
    </div>
  );
}
