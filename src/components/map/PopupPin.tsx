import { Popup } from '@/types/popup';

export function getPopupPinHtml(popup: Popup, isHighlighted: boolean = false): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dDayText = '';
  let isNew = false;

  if (popup.endDate) {
    const end = new Date(popup.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTimeEnd = end.getTime() - today.getTime();
    const diffDaysEnd = Math.ceil(diffTimeEnd / (1000 * 60 * 60 * 24));

    if (diffDaysEnd <= 3 && diffDaysEnd >= 0) {
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

  const isEnded = popup.status === 'ended';
  if (isEnded) dDayText = 'END';

  let bgClass = isNew && !isEnded ? 'bg-brandRed !text-white' : 'bg-paper text-ink';
  if (isHighlighted && !isEnded) {
    bgClass = 'bg-brandRed !text-white';
  }
  if (isEnded) {
    bgClass = 'bg-gray-400 text-white border-gray-500';
  }

  const highlightClass = isHighlighted
    ? `scale-125 z-[100] shadow-[4px_4px_0_theme(colors.ink)] animate-[bounce_1s_infinite] ${isEnded ? 'border-gray-600' : 'border-brandRed'}`
    : `shadow-[2px_2px_0_theme(colors.ink)] z-10 ${isEnded ? 'border-gray-500 opacity-75' : 'border-ink'}`;

  return `
    <div class="relative cursor-pointer transition-all duration-300 ${isHighlighted ? '-translate-y-2 z-[100]' : 'hover:-translate-y-1'}" title="${popup.name}">
      <div class="stub px-2 py-1 text-[10px] font-mono font-bold border-2 ${bgClass} ${highlightClass}">
        ${dDayText}
      </div>
    </div>
  `;
}
