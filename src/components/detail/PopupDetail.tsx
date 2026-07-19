import React from 'react';
import { Popup } from '@/types/popup';

interface PopupDetailProps {
  popup: Popup;
  onClose: () => void;
}

export function PopupDetail({ popup, onClose }: PopupDetailProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = '';
  let isClosingSoon = false;
  let isNew = false;

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

  if (popup.startDate) {
    const start = new Date(popup.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTimeStart = today.getTime() - start.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    if (diffDaysStart >= 0 && diffDaysStart <= 1) {
      isNew = true;
      dDayText = 'NEW';
    }
  }

  if (!dDayText) dDayText = 'D-?';

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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-paper border-l-2 border-ink z-50 overflow-y-auto flex flex-col shadow-[-4px_0_0_theme(colors.ink)]">
        {/* Header Image */}
        <div className="relative w-full h-[250px] bg-neutral-200 border-b-2 border-ink shrink-0">
          {popup.images && popup.images.length > 0 ? (
            <img src={popup.images[0]} alt={popup.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brandBlue to-brandRed"></div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-card border-2 border-ink shadow-[2px_2px_0_theme(colors.ink)] flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[4px_4px_0_theme(colors.ink)] transition-all z-10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div className={`absolute -bottom-3 left-6 stub px-3 py-1.5 text-xs font-mono font-bold border-2 border-ink ${isNew ? 'bg-brandRed !text-white' : ''}`}>
            {dDayText}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-8 flex-1 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 border-2 border-ink bg-brandYellow">
                {categoryLabels[popup.category] || '기타'}
              </span>
              {isClosingSoon && (
                <span className="text-xs font-bold text-brandRed">마감임박</span>
              )}
            </div>
            <h2 className="font-display text-3xl tracking-tight leading-none mb-3">{popup.name}</h2>
            <p className="text-sm font-bold text-neutral-600">{popup.address || '주소 정보 없음'}</p>
            <p className="text-sm font-mono font-bold mt-1 text-brandBlue">{dateRange}</p>
          </div>

          {popup.description && (
            <div className="border-t-2 border-ink pt-6">
              <h3 className="font-bold mb-3 text-sm">상세 정보</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{popup.description}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {popup.sourceUrl && (
          <div className="p-6 border-t-2 border-ink bg-card">
            <a 
              href={popup.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-brandBlue text-white text-center font-bold border-2 border-ink shadow-[4px_4px_0_theme(colors.ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_theme(colors.ink)] transition-all"
            >
              원문 보기 ↗
            </a>
          </div>
        )}
      </div>
    </>
  );
}
